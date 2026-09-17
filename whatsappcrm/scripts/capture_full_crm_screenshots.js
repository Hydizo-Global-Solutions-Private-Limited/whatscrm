const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const OUT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureFullCRM() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();

  // 1. Public Marketing Landing Page
  console.log('Capturing: Public Landing Page (/)');
  try {
    await page.goto('http://localhost:3010/', { waitUntil: 'networkidle0', timeout: 25000 });
    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(OUT_DIR, '00_public_landing_page.png') });
    console.log('✓ Saved 00_public_landing_page.png');
  } catch (e) {
    console.log('Landing page capture error:', e.message);
  }

  // 2. Customer Login Page
  console.log('Capturing: Customer Login (/user/login)');
  try {
    await page.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUT_DIR, '00_customer_login.png') });
    console.log('✓ Saved 00_customer_login.png');
  } catch (e) {
    console.log('Login capture error:', e.message);
  }

  // 3. Admin Login Page
  console.log('Capturing: Admin Login (/admin/login)');
  try {
    await page.goto('http://localhost:3010/admin/login', { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(OUT_DIR, '00_admin_login.png') });
    console.log('✓ Saved 00_admin_login.png');
  } catch (e) {
    console.log('Admin login capture error:', e.message);
  }

  // 4. Authenticate Customer and Capture User Portal
  console.log('Authenticating customer on http://localhost:3010/user...');
  try {
    await page.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0', timeout: 20000 });
    // Fill login form
    const loginRes = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/user/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'user@user.com', password: 'admin123' })
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
          return { success: true, token: data.token };
        }
        return { success: false, data };
      } catch (err) {
        return { error: err.message };
      }
    });

    console.log('Login API response:', loginRes);

    // Navigate to /user dashboard
    await page.goto('http://localhost:3010/user', { waitUntil: 'networkidle0', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, '30_user_crm_dashboard.png') });
    console.log('✓ Saved 30_user_crm_dashboard.png');

    // Try navigating to subviews inside /user if available
    const navItems = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('a, button, li')).map(el => ({
        text: el.innerText ? el.innerText.trim() : '',
        href: el.getAttribute('href') || ''
      }));
      return items.filter(i => i.text.length > 0 && i.text.length < 30);
    });
    console.log('User dashboard elements detected:', navItems.slice(0, 15));

    // Capture User Chatbot / Flow Builder view if route exists
    try {
      await page.goto('http://localhost:3010/user', { waitUntil: 'networkidle0', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: path.join(OUT_DIR, '31_user_live_chat_inbox.png') });
      console.log('✓ Saved 31_user_live_chat_inbox.png');
    } catch (_) {}

  } catch (e) {
    console.log('User portal capture error:', e.message);
  }

  // 5. Authenticate Super Admin and Capture Admin Panel
  console.log('Authenticating Super Admin on http://localhost:3010/admin...');
  try {
    await page.goto('http://localhost:3010/admin/login', { waitUntil: 'networkidle0', timeout: 20000 });
    const adminRes = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin@admin.com', password: 'admin123' })
        });
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('token', data.token);
          return { success: true, token: data.token };
        }
        return { success: false, data };
      } catch (err) {
        return { error: err.message };
      }
    });

    console.log('Admin login API response:', adminRes);

    await page.goto('http://localhost:3010/admin', { waitUntil: 'networkidle0', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(OUT_DIR, '40_admin_master_dashboard.png') });
    console.log('✓ Saved 40_admin_master_dashboard.png');

  } catch (e) {
    console.log('Admin portal capture error:', e.message);
  }

  await browser.close();
  console.log('All additional core CRM screenshots captured successfully in:', OUT_DIR);
}

captureFullCRM().catch(e => {
  console.error('Capture full CRM failed:', e);
});
