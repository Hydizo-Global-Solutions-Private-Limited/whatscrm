const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, '../docs/screenshots');

async function captureUserPanels() {
  console.log('Capturing User CRM Subpanels cleanly...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0' });
  await page.type('input[type=text]', 'user@user.com');
  await page.type('input[type=password]', 'admin123');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Sign in with email'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log('Logged in at:', page.url());

  const panels = [
    { name: 'Inbox', file: '31_user_live_chat_inbox.png' },
    { name: 'Add WhatsApp by QR', file: '32_user_qr_pairing_engine.png' },
    { name: 'Automation Flows', file: '33_user_chatbot_flow_builder.png' },
    { name: 'QR Bulk Campaign', file: '34_user_broadcast_scheduler.png' },
    { name: 'Phonebook', file: '35_user_phonebook_contacts.png' },
    { name: 'Manage Webhooks', file: '36_user_webhook_automation.png' },
    { name: 'WA Chatbot', file: '37_user_rule_autoresponder.png' },
    { name: 'WhatsApp Forms', file: '38_user_interactive_forms.png' }
  ];

  for (const p of panels) {
    // Navigate back to user base dashboard to ensure sidebar is rendered
    await page.goto('http://localhost:3010/user', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1200));

    const box = await page.evaluate((targetText) => {
      const elements = Array.from(document.querySelectorAll('.MuiListItemButton-root, .MuiButtonBase-root, a, button, li'));
      let target = elements.find(el => {
        const t = el.innerText ? el.innerText.trim() : '';
        return t === targetText || t.startsWith(targetText);
      });
      if (!target) {
        const spans = Array.from(document.querySelectorAll('span, p, div'));
        const found = spans.find(s => s.innerText && s.innerText.trim() === targetText);
        if (found) target = found.closest('.MuiListItemButton-root') || found.closest('.MuiButtonBase-root') || found;
      }
      if (!target) return null;
      target.scrollIntoView({ block: 'center', inline: 'center' });
      const rect = target.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, p.name);

    if (box) {
      await page.mouse.click(box.x, box.y);
      await new Promise(r => setTimeout(r, 2500));
      console.log(`User Panel "${p.name}": clicked=true, URL=${page.url()}`);
      await page.screenshot({ path: path.join(OUT_DIR, p.file) });
      console.log(`✓ Saved ${p.file}`);
    } else {
      console.log(`User Panel "${p.name}": clicked=false!`);
    }
  }

  await browser.close();
  console.log('User subpanels capture complete!');
}

captureUserPanels().catch(console.error);
