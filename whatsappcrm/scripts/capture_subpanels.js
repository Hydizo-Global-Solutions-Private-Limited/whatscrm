const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, '../docs/screenshots');

async function captureSubpanels() {
  console.log('Launching browser to capture core CRM subpanels...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();

  // 1. Capture Login Cards first (before logging in)
  console.log('Capturing: Public Landing, Customer Login, Admin Login...');
  await page.goto('http://localhost:3010/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT_DIR, '00_public_landing_page.png') });
  console.log('✓ 00_public_landing_page.png');

  await page.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT_DIR, '00_customer_login.png') });
  console.log('✓ 00_customer_login.png');

  await page.goto('http://localhost:3010/admin/login', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(OUT_DIR, '00_admin_login.png') });
  console.log('✓ 00_admin_login.png');

  // 2. Log in as Customer
  console.log('Logging in as customer on /user/login...');
  await page.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0' });
  await page.type('input[type=text]', 'user@user.com');
  await page.type('input[type=password]', 'admin123');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Sign in with email'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT_DIR, '30_user_crm_dashboard.png') });
  console.log('✓ 30_user_crm_dashboard.png');

  // Sub-panels in User Dashboard
  const userClicks = [
    { text: 'Inbox', file: '31_user_live_chat_inbox.png' },
    { text: 'Add WhatsApp by QR', file: '32_user_qr_pairing_engine.png' },
    { text: 'Automation Flows', file: '33_user_chatbot_flow_builder.png' },
    { text: 'QR Bulk Campaign', file: '34_user_broadcast_scheduler.png' },
    { text: 'Phonebook', file: '35_user_phonebook_contacts.png' },
    { text: 'Manage Webhooks', file: '36_user_webhook_automation.png' },
    { text: 'WA Chatbot', file: '37_user_rule_autoresponder.png' },
    { text: 'WhatsApp Forms', file: '38_user_interactive_forms.png' },
  ];

  for (const item of userClicks) {
    try {
      console.log(`Clicking user nav: "${item.text}" -> ${item.file}`);
      const clicked = await page.evaluate((targetText) => {
        const elements = Array.from(document.querySelectorAll('a, button, li, span, div[role=button]'));
        const target = elements.find(el => el.innerText && el.innerText.trim() === targetText);
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, item.text);

      if (clicked) {
        await new Promise(r => setTimeout(r, 1800));
        await page.screenshot({ path: path.join(OUT_DIR, item.file) });
        console.log(`✓ Saved ${item.file}`);
      } else {
        console.log(`Could not find button "${item.text}"`);
      }
    } catch (e) {
      console.log(`Error on ${item.text}:`, e.message);
    }
  }

  // 3. Log in as Super Admin
  console.log('Logging in as Super Admin on /admin/login...');
  await page.goto('http://localhost:3010/admin/login', { waitUntil: 'networkidle0' });
  await page.type('input[type=text], input[type=email]', 'admin@admin.com');
  await page.type('input[type=password]', 'admin123');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('login') || b.type === 'submit');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: path.join(OUT_DIR, '40_admin_master_dashboard.png') });
  console.log('✓ 40_admin_master_dashboard.png');

  // Sub-panels in Admin Dashboard
  const adminClicks = [
    { text: 'Manage Plans', file: '41_admin_subscription_plans.png' },
    { text: 'Manage Users', file: '42_admin_user_management.png' },
    { text: 'Orders', file: '43_admin_orders_finance.png' },
    { text: 'Payment Gateways', file: '44_admin_payment_gateways.png' },
    { text: 'Theme Settings', file: '45_admin_theme_branding.png' },
    { text: 'SMTP', file: '46_admin_smtp_email_config.png' },
    { text: 'Site Settings', file: '47_admin_site_settings.png' },
  ];

  for (const item of adminClicks) {
    try {
      console.log(`Clicking admin nav: "${item.text}" -> ${item.file}`);
      const clicked = await page.evaluate((targetText) => {
        const elements = Array.from(document.querySelectorAll('a, button, li, span, div[role=button]'));
        const target = elements.find(el => el.innerText && el.innerText.trim() === targetText);
        if (target) {
          target.click();
          return true;
        }
        return false;
      }, item.text);

      if (clicked) {
        await new Promise(r => setTimeout(r, 1800));
        await page.screenshot({ path: path.join(OUT_DIR, item.file) });
        console.log(`✓ Saved ${item.file}`);
      } else {
        console.log(`Could not find admin button "${item.text}"`);
      }
    } catch (e) {
      console.log(`Error on admin ${item.text}:`, e.message);
    }
  }

  await browser.close();
  console.log('Subpanels capture finished successfully!');
}

captureSubpanels().catch(e => {
  console.error('Capture subpanels error:', e);
});
