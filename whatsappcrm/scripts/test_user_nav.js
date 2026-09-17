const puppeteer = require('puppeteer-core');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3010/user/login', { waitUntil: 'networkidle0' });

  // Type credentials
  await page.type('input[type=text]', 'user@user.com');
  await page.type('input[type=password]', 'admin123');

  // Click submit button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const submitBtn = btns.find(b => b.innerText.includes('Sign in with email'));
    if (submitBtn) submitBtn.click();
  });

  // Wait for login and navigation
  await new Promise(r => setTimeout(r, 4000));
  console.log('Current URL after login:', page.url());

  const navItems = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('a, button, li, span, div[role=button]'));
    return elements
      .map(el => ({
        text: (el.innerText || '').trim(),
        role: el.getAttribute('role') || '',
        tag: el.tagName
      }))
      .filter(x => x.text.length > 2 && x.text.length < 30 && !x.text.includes('\n'));
  });

  console.log('Navigation items detected:');
  const unique = Array.from(new Set(navItems.map(x => x.text)));
  console.log(unique);

  await browser.close();
})();
