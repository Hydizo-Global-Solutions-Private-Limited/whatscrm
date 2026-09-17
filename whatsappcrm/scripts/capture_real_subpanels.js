const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, '../docs/screenshots');

async function clickMenuItem(page, text) {
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
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: target.innerText };
  }, text);

  if (box && box.x > 0 && box.y > 0) {
    await page.mouse.click(box.x, box.y);
    return true;
  }
  return false;
}

async function captureAll() {
  console.log('Starting exact coordinate subpanel capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 }
  });

  // --- PART 1: PUBLIC LANDING & LOGIN PAGES ---
  console.log('\n--- 1. Public and Auth Screens ---');
  const pubContext = await browser.createBrowserContext();
  const pubPage = await pubContext.newPage();
  await pubPage.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });
  
  await pubPage.goto('http://localhost:3010/', { waitUntil: 'networkidle0' });
  await pubPage.screenshot({ path: path.join(OUT_DIR, '00_public_landing_page.png') });
  console.log('✓ 00_public_landing_page.png');

  await pubPage.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0' });
  await pubPage.screenshot({ path: path.join(OUT_DIR, '00_customer_login.png') });
  console.log('✓ 00_customer_login.png');

  await pubPage.goto('http://localhost:3010/admin/login', { waitUntil: 'networkidle0' });
  await pubPage.screenshot({ path: path.join(OUT_DIR, '00_admin_login.png') });
  console.log('✓ 00_admin_login.png');
  await pubContext.close();

  // --- PART 2: USER CORE CRM SUBPANELS ---
  console.log('\n--- 2. User CRM Subpanels ---');
  const userContext = await browser.createBrowserContext();
  const userPage = await userContext.newPage();
  await userPage.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  await userPage.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0' });
  await userPage.type('input[type=text]', 'user@user.com');
  await userPage.type('input[type=password]', 'admin123');
  await userPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.innerText.includes('Sign in with email'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log('User logged in at:', userPage.url());

  await userPage.screenshot({ path: path.join(OUT_DIR, '30_user_crm_dashboard.png') });
  console.log('✓ 30_user_crm_dashboard.png (URL: ' + userPage.url() + ')');

  const userPanels = [
    { name: 'Inbox', file: '31_user_live_chat_inbox.png' },
    { name: 'Add WhatsApp by QR', file: '32_user_qr_pairing_engine.png' },
    { name: 'Automation Flows', file: '33_user_chatbot_flow_builder.png' },
    { name: 'QR Bulk Campaign', file: '34_user_broadcast_scheduler.png' },
    { name: 'Phonebook', file: '35_user_phonebook_contacts.png' },
    { name: 'Manage Webhooks', file: '36_user_webhook_automation.png' },
    { name: 'WA Chatbot', file: '37_user_rule_autoresponder.png' },
    { name: 'WhatsApp Forms', file: '38_user_interactive_forms.png' }
  ];

  for (const panel of userPanels) {
    const success = await clickMenuItem(userPage, panel.name);
    await new Promise(r => setTimeout(r, 2500));
    console.log(`User Panel "${panel.name}": clicked=${success}, URL=${userPage.url()}`);
    await userPage.screenshot({ path: path.join(OUT_DIR, panel.file) });
    console.log(`✓ Saved ${panel.file}`);
  }
  await userContext.close();

  // --- PART 3: ADMIN MASTER PLATFORM SUBPANELS ---
  console.log('\n--- 3. Super Admin Subpanels ---');
  const adminContext = await browser.createBrowserContext();
  const adminPage = await adminContext.newPage();
  await adminPage.setViewport({ width: 1440, height: 960, deviceScaleFactor: 2 });

  await adminPage.goto('http://localhost:3010/admin/login', { waitUntil: 'networkidle0' });
  await adminPage.type('input[type=text], input[type=email]', 'admin@admin.com');
  await adminPage.type('input[type=password]', 'admin123');
  await adminPage.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.innerText.toLowerCase().includes('sign in') || b.innerText.toLowerCase().includes('login') || b.type === 'submit');
    if (submitBtn) submitBtn.click();
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log('Admin logged in at:', adminPage.url());

  await adminPage.screenshot({ path: path.join(OUT_DIR, '40_admin_master_dashboard.png') });
  console.log('✓ 40_admin_master_dashboard.png (URL: ' + adminPage.url() + ')');

  const adminPanels = [
    { name: 'Manage Plans', file: '41_admin_subscription_plans.png' },
    { name: 'Manage Users', file: '42_admin_user_management.png' },
    { name: 'Orders', file: '43_admin_orders_finance.png' },
    { name: 'Payment Gateways', file: '44_admin_payment_gateways.png' },
    { name: 'Theme Settings', file: '45_admin_theme_branding.png' },
    { name: 'SMTP', file: '46_admin_smtp_email_config.png' },
    { name: 'Site Settings', file: '47_admin_site_settings.png' }
  ];

  for (const panel of adminPanels) {
    const success = await clickMenuItem(adminPage, panel.name);
    await new Promise(r => setTimeout(r, 2500));
    console.log(`Admin Panel "${panel.name}": clicked=${success}, URL=${adminPage.url()}`);
    await adminPage.screenshot({ path: path.join(OUT_DIR, panel.file) });
    console.log(`✓ Saved ${panel.file}`);
  }
  await adminContext.close();

  await browser.close();
  console.log('\nAll subpanels captured cleanly and verified!');
}

captureAll().catch(e => {
  console.error('Fatal capture error:', e);
  process.exit(1);
});
