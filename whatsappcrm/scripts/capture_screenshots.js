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

const TABS = [
  { id: 'scanner', name: '01_ai_card_scanner', title: 'AI Business Card Scanner' },
  { id: 'batch', name: '02_batch_scanner', title: 'Batch Card Scan' },
  { id: 'profile', name: '03_digital_profile_nfc', title: 'Digital Profile & NFC Hub' },
  { id: 'shared', name: '04_viral_shared_links', title: 'Viral Shared Cards' },
  { id: 'pipeline', name: '05_kanban_pipeline', title: '7-Stage Lead Kanban Pipeline' },
  { id: 'events', name: '06_event_workspaces', title: 'Event Workspaces & Social Wall' },
  { id: 'tasks', name: '07_voice_crm_tasks', title: 'Voice-to-Task CRM' },
  { id: 'google', name: '08_google_workspace_sync', title: 'Google Workspace & Sheets Sync' },
  { id: 'email', name: '09_email_templates', title: 'Email Follow-up Templates' },
  { id: 'aicopilot', name: '10_ai_chat_copilot', title: 'AI Chat Copilot' },
  { id: 'referrals', name: '11_referral_rewards', title: 'Referral Rewards Engine' },
  { id: 'map', name: '12_geo_network_map', title: 'Geo-Network Interactive Map' },
  { id: 'fairusage', name: '13_fair_usage_quota', title: 'Fair Usage & AI Quota Tracking' },
  { id: 'mobileapp', name: '14_mobile_app_overview', title: 'iOS & Android Native Mobile App' },
  { id: 'agents', name: '15_round_robin_agents', title: 'WhatsApp Multi-Agent Round-Robin' },
  { id: 'connectors', name: '16_crm_connectors', title: 'CRM Webhooks (HubSpot/Salesforce/Zoho)' },
  { id: 'reviver', name: '17_ghosting_reviver', title: 'Automated WhatsApp Ghosting Reviver' },
  { id: 'signatures', name: '18_email_signatures', title: '1-Click Interactive Email Signatures' },
  { id: 'community', name: '19_b2b_community_feed', title: 'B2B Community Feed & Lead Exchange' },
  { id: 'templates', name: '20_sales_script_vault', title: 'WhatsApp Sales Script & Template Vault' },
];

async function captureAll() {
  console.log('Launching browser with Chrome at:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,960'],
    defaultViewport: { width: 1440, height: 960, deviceScaleFactor: 2 }
  });

  const page = await browser.newPage();

  console.log('Navigating to http://localhost:3010/networking...');
  await page.goto('http://localhost:3010/networking', { waitUntil: 'networkidle0', timeout: 30000 });

  // Wait 1.5s for auth & initial script execution
  await new Promise(r => setTimeout(r, 1500));

  for (const tab of TABS) {
    console.log(`Capturing tab: ${tab.id} -> ${tab.name}.png`);
    try {
      await page.evaluate((tabId) => {
        if (typeof switchTab === 'function') {
          switchTab(tabId);
        }
      }, tab.id);

      // Wait for content rendering & API responses
      await new Promise(r => setTimeout(r, 1000));

      const filePath = path.join(OUT_DIR, `${tab.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`✓ Saved: ${filePath}`);
    } catch (err) {
      console.error(`Error capturing tab ${tab.id}:`, err.message);
    }
  }

  // Also capture Public Digital Profile & Reciprocal Swap page
  try {
    console.log('Capturing public digital profile page...');
    await page.goto('http://localhost:3010/p/demo_executive', { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1000));
    const publicProfilePath = path.join(OUT_DIR, '21_public_digital_card.png');
    await page.screenshot({ path: publicProfilePath, fullPage: false });
    console.log(`✓ Saved: ${publicProfilePath}`);
  } catch (err) {
    console.log('Public profile capture notice:', err.message);
  }

  await browser.close();
  console.log('All screenshots captured successfully in:', OUT_DIR);
}

captureAll().catch(err => {
  console.error('Capture process failed:', err);
  process.exit(1);
});
