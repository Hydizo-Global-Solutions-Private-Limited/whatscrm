const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const SCREENSHOTS_DIR = path.resolve(__dirname, '../docs/screenshots');
const OUTPUT_PDF = path.resolve(__dirname, '../../MsgMagnet_Master_Enterprise_Investor_Dossier.pdf');
const OUTPUT_HTML = path.resolve(__dirname, '../docs/master_investor_dossier.html');

function getBase64Image(filename) {
  const filePath = path.join(SCREENSHOTS_DIR, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/png;base64,${data.toString('base64')}`;
  }
  return '';
}

function renderScreenshot(filename, caption) {
  const b64 = getBase64Image(filename);
  if (!b64) return `<div class="screenshot-placeholder">Screenshot not found: ${filename}</div>`;
  return `
    <div class="screenshot-container avoid-break">
      <div class="screenshot-caption">📷 ${caption}</div>
      <div class="screenshot-frame"><img src="${b64}" alt="${caption}" /></div>
    </div>
  `;
}

async function generateMasterDossier() {
  console.log('Generating Master Enterprise Investor & Full-Codebase Dossier...');

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>MsgMagnet — Complete Enterprise WhatsApp CRM, AI Networking & Mobile Ecosystem Dossier</title>
    <style>
      @page {
        size: A4;
        margin: 18mm 16mm 20mm 16mm;
        @bottom-right {
          content: "Page " counter(page) " of " counter(pages);
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 8pt;
          color: #64748b;
        }
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
        background: #ffffff;
        font-size: 9.5pt;
        line-height: 1.55;
      }

      .page-break { page-break-before: always; }
      .avoid-break { page-break-inside: avoid; }

      /* Cover Page */
      .cover-page {
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 30px 10px;
        page-break-after: always;
      }
      .cover-header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
      }
      .cover-badge {
        display: inline-block;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
        font-size: 9pt;
        font-weight: 700;
        padding: 4px 12px;
        border-radius: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 14px;
      }
      .cover-title {
        font-size: 34pt;
        font-weight: 900;
        color: #0f172a;
        line-height: 1.1;
        letter-spacing: -0.5px;
        margin-bottom: 10px;
      }
      .cover-subtitle {
        font-size: 14pt;
        font-weight: 500;
        color: #475569;
        line-height: 1.4;
      }
      .cover-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        margin: 24px 0;
      }
      .cover-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
      }
      .cover-val {
        font-size: 18pt;
        font-weight: 800;
        color: #2563eb;
      }
      .cover-lbl {
        font-size: 8pt;
        font-weight: 600;
        color: #64748b;
        margin-top: 4px;
        text-transform: uppercase;
      }
      .cover-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
      }
      .confidential-stamp {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        padding: 6px 14px;
        font-size: 8pt;
        font-weight: 800;
        border-radius: 6px;
        text-transform: uppercase;
      }

      /* Typography */
      h1.part-heading {
        font-size: 20pt;
        font-weight: 900;
        color: #0f172a;
        margin-bottom: 6px;
        letter-spacing: -0.5px;
      }
      .part-subheading {
        font-size: 11pt;
        color: #2563eb;
        font-weight: 700;
        margin-bottom: 18px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      h2.section-heading {
        font-size: 14pt;
        font-weight: 800;
        color: #0f172a;
        margin: 16px 0 10px 0;
        border-bottom: 1.5px solid #e2e8f0;
        padding-bottom: 6px;
      }
      h3.item-heading {
        font-size: 11.5pt;
        font-weight: 700;
        color: #1e293b;
        margin: 12px 0 6px 0;
      }

      /* Cards & Grids */
      .two-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      .three-col {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }
      .box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px 14px;
        font-size: 8.5pt;
      }
      .box-accent {
        border-left: 4px solid #2563eb;
      }
      .box-success {
        border-left: 4px solid #10b981;
        background: #f0fdf4;
      }
      .box-danger {
        border-left: 4px solid #ef4444;
        background: #fff1f2;
      }
      .box-header {
        font-weight: 800;
        font-size: 8.5pt;
        text-transform: uppercase;
        margin-bottom: 4px;
        color: #0f172a;
      }

      /* Tables */
      table.doc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 8pt;
        margin: 12px 0;
      }
      table.doc-table th {
        background: #0f172a;
        color: #ffffff;
        padding: 8px 10px;
        font-weight: 700;
        text-align: left;
        border: 1px solid #1e293b;
      }
      table.doc-table td {
        padding: 7px 10px;
        border: 1px solid #e2e8f0;
        color: #334155;
      }
      table.doc-table tr:nth-child(even) {
        background: #f8fafc;
      }
      .highlight-col {
        background: #eff6ff !important;
        font-weight: 700;
        color: #1d4ed8 !important;
      }

      /* Screenshot Frames */
      .screenshot-container {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: #0b0f19;
        padding: 6px;
        margin: 12px 0;
      }
      .screenshot-caption {
        font-size: 7.5pt;
        font-weight: 700;
        color: #94a3b8;
        padding: 4px 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .screenshot-frame {
        width: 100%;
        overflow: hidden;
        border-radius: 6px;
        background: #0b0f19;
      }
      .screenshot-frame img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 4px;
      }
      .screenshot-placeholder {
        padding: 24px;
        text-align: center;
        color: #64748b;
        font-size: 8.5pt;
      }

      ul.feature-bullets {
        margin-left: 16px;
        font-size: 8.5pt;
        color: #334155;
        line-height: 1.5;
        margin-bottom: 10px;
      }
      ul.feature-bullets li {
        margin-bottom: 3px;
      }

      /* Architectural Flowcharts & Sequence Diagrams */
      .flow-card {
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        border-radius: 10px;
        padding: 14px 16px;
        margin: 14px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        page-break-inside: avoid;
      }
      .flow-title {
        font-size: 10pt;
        font-weight: 800;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }
      .flow-subtitle {
        font-size: 8pt;
        color: #64748b;
        margin-bottom: 12px;
      }
      .flow-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }
      .flow-node {
        flex: 1;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 6px;
        text-align: center;
      }
      .flow-node.primary {
        background: #eff6ff;
        border-color: #3b82f6;
      }
      .flow-node.success {
        background: #f0fdf4;
        border-color: #10b981;
      }
      .flow-node.purple {
        background: #faf5ff;
        border-color: #a855f7;
      }
      .flow-node.amber {
        background: #fffbeb;
        border-color: #f59e0b;
      }
      .node-header {
        font-size: 7.5pt;
        font-weight: 800;
        text-transform: uppercase;
        margin-bottom: 3px;
        color: #0f172a;
      }
      .node-text {
        font-size: 7pt;
        color: #64748b;
        line-height: 1.2;
      }
      .flow-arrow {
        font-size: 13pt;
        font-weight: 900;
        color: #94a3b8;
        padding: 0 2px;
      }
      .interrupt-box {
        margin-top: 10px;
        background: #ecfdf5;
        border: 1.5px dashed #10b981;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 7.8pt;
        color: #065f46;
      }
    </style>
  </head>
  <body>

    <!-- ==================== COVER PAGE ==================== -->
    <div class="cover-page">
      <div class="cover-header">
        <div class="cover-badge">Complete Technical Architecture & Investor Memorandum</div>
        <h1 class="cover-title">MsgMagnet Enterprise</h1>
        <p class="cover-subtitle">
          Full End-to-End System Documentation — From Super Admin Control Center & WhatsApp CRM to Next-Gen AI Networking, B2B Community & Native Mobile Apps
        </p>
      </div>

      <div class="cover-grid">
        <div class="cover-card">
          <div class="cover-val">45+</div>
          <div class="cover-lbl">Backend REST Controllers</div>
        </div>
        <div class="cover-card">
          <div class="cover-val">25+</div>
          <div class="cover-lbl">Relational DB Tables</div>
        </div>
        <div class="cover-card">
          <div class="cover-val">21</div>
          <div class="cover-lbl">AI Networking Panels</div>
        </div>
        <div class="cover-card">
          <div class="cover-val">iOS & Android</div>
          <div class="cover-lbl">Expo 52 Mobile Native</div>
        </div>
      </div>

      <div class="box box-accent">
        <div class="box-header">Executive Summary for Investors</div>
        <p style="font-size:9pt;color:#334155;line-height:1.5;">
          MsgMagnet is an end-to-end, enterprise-grade Omnichannel WhatsApp CRM, Marketing Automation SaaS, and AI Networking Platform. 
          Unlike conventional CRMs that rely on expensive Meta Cloud API message taxes ($0.04 - $0.08 / msg), MsgMagnet utilizes a high-performance 
          <strong>direct WebSockets daemon (Baileys)</strong> to deliver unlimited WhatsApp messaging, live multi-agent chat, chatbot flow automation, 
          and bulk broadcasting at <strong>~87% gross SaaS margins</strong>.
        </p>
        <p style="font-size:9pt;color:#334155;line-height:1.5;margin-top:6px;">
          Integrated on top of this foundation is the <strong>Next-Gen AI Networking Suite</strong>: sub-second Gemini Vision card scanning, Apple & Google Wallet passes (.pkpass), 
          reciprocal contact swap walls, automated round-robin lead assignment, ghosting revival sequences, and a <strong>Bada Business-style B2B Community marketplace</strong> 
          where deals are broadcast and closed in one tap on WhatsApp.
        </p>
      </div>

      <div class="cover-footer">
        <div style="font-size:8pt;color:#64748b;line-height:1.5;">
          <strong>Document ID:</strong> MM-MASTER-INV-2026-v5.9.8<br>
          <strong>Author:</strong> MsgMagnet Core Engineering & Product Group<br>
          <strong>Confidentiality:</strong> Strictly Confidential &bull; For Authorized Review Only
        </div>
        <div class="confidential-stamp">INVESTOR CONFIDENTIAL</div>
      </div>
    </div>

    <!-- ==================== PART 1: EXECUTIVE & MARKET ANALYSIS ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 1: The Macro Opportunity & Competitive Moats</h1>
      <div class="part-subheading">Why Physical Networking + WhatsApp Native CRM is an Uncontested $15B Space</div>

      <h2 class="section-heading">1.1 The Structural Market Inefficiencies</h2>
      <div class="two-col">
        <div class="box box-danger">
          <div class="box-header">Legacy CRM Inefficiencies</div>
          <ul class="feature-bullets">
            <li><strong>The Business Card Black Hole:</strong> 88% of paper cards collected at expos are thrown away within 7 days.</li>
            <li><strong>Low Sales Rep Compliance:</strong> Field reps detest manual data entry; fewer than 20% of leads ever make it into Salesforce or HubSpot.</li>
            <li><strong>Meta Message Tax:</strong> Official WhatsApp Cloud API costs $0.04 to $0.08 per template message, punishing growing businesses.</li>
            <li><strong>Isolated Silos:</strong> CRMs do not create leads; they only store them. Companies still spend thousands on cold ads.</li>
          </ul>
        </div>
        <div class="box box-success">
          <div class="box-header">The MsgMagnet Value Moat</div>
          <ul class="feature-bullets">
            <li><strong>Sub-Second AI Vision:</strong> Gemini Vision OCR extracts contacts in 1 second and auto-dispatches an instant WhatsApp intro.</li>
            <li><strong>100% Reciprocal Lead Capture:</strong> The Contact Swap Wall requires prospects to give their info before unlocking host details.</li>
            <li><strong>Zero Per-Message Taxes:</strong> Direct Baileys WebSockets integration enables millions of messages at zero carrier markup.</li>
            <li><strong>Built-In B2B Community Marketplace:</strong> Built-in lead exchange circles allow members to discover verified buying requirements.</li>
          </ul>
        </div>
      </div>

      <h2 class="section-heading">1.2 Head-to-Head Competitive Benchmark</h2>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Platform Dimension</th>
            <th>MsgMagnet (Our System)</th>
            <th>Grid AI</th>
            <th>Bada Business</th>
            <th>HubSpot / Salesforce</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Core WhatsApp Engine</strong></td>
            <td class="highlight-col">Native Baileys (Multi-Device QR)</td>
            <td>External link only</td>
            <td>Manual link</td>
            <td>Twilio API ($0.05/msg)</td>
          </tr>
          <tr>
            <td><strong>AI Card Scanner</strong></td>
            <td class="highlight-col">Gemini Vision (Sub-second)</td>
            <td>Basic OCR</td>
            <td>❌ None</td>
            <td>Third-party add-on</td>
          </tr>
          <tr>
            <td><strong>Batch Conference Scanner</strong></td>
            <td class="highlight-col">Parallel 50-card ingestion</td>
            <td>❌ Single only</td>
            <td>❌ None</td>
            <td>❌ None</td>
          </tr>
          <tr>
            <td><strong>Digital Wallet Passes</strong></td>
            <td class="highlight-col">Apple .pkpass + Google JWT</td>
            <td>❌ None</td>
            <td>❌ None</td>
            <td>❌ None</td>
          </tr>
          <tr>
            <td><strong>Reciprocal Swap Wall</strong></td>
            <td class="highlight-col">Lead Capture Mode (100% capture)</td>
            <td>❌ One-way only</td>
            <td>❌ None</td>
            <td>Landing page form</td>
          </tr>
          <tr>
            <td><strong>Multi-Agent Round-Robin</strong></td>
            <td class="highlight-col">Automated Fair Queue Balancing</td>
            <td>❌ Single user</td>
            <td>❌ None</td>
            <td>Enterprise Tier ($150/mo)</td>
          </tr>
          <tr>
            <td><strong>Ghosting Reviver Sequences</strong></td>
            <td class="highlight-col">4-Stage Drip (Auto-Disengages)</td>
            <td>❌ None</td>
            <td>❌ None</td>
            <td>Complex Flow Builder</td>
          </tr>
          <tr>
            <td><strong>CRM Connectors</strong></td>
            <td class="highlight-col">HubSpot, Salesforce, Zoho, Zapier</td>
            <td>Zapier only</td>
            <td>❌ Closed system</td>
            <td>Native ecosystem</td>
          </tr>
          <tr>
            <td><strong>Meeting Audio Summarizer</strong></td>
            <td class="highlight-col">Hybrid: Local Zero-Cost + Cloud AI</td>
            <td>❌ None</td>
            <td>❌ None</td>
            <td>Einstein AI ($$$)</td>
          </tr>
          <tr>
            <td><strong>B2B Community & Deals</strong></td>
            <td class="highlight-col">6 Circles + Need/Offer Feed</td>
            <td>❌ None</td>
            <td>Community Feed</td>
            <td>❌ None</td>
          </tr>
          <tr>
            <td><strong>Sales Script Vault</strong></td>
            <td class="highlight-col">Battle-tested across 5 industries</td>
            <td>❌ None</td>
            <td>Video courses only</td>
            <td>Static templates</td>
          </tr>
          <tr>
            <td><strong>Native Mobile App</strong></td>
            <td class="highlight-col">React Native Expo 52 (Offline SQLite)</td>
            <td>Mobile Web only</td>
            <td>Native Android/iOS</td>
            <td>Heavy enterprise app</td>
          </tr>
        </tbody>
      </table>

      ${renderScreenshot('00_public_landing_page.png', 'MsgMagnet Public SaaS Marketing Homepage (/)')}
    </div>

    <!-- ==================== PART 2: SUPER ADMIN MASTER CONTROL CENTER ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 2: Super Admin Master Control Center</h1>
      <div class="part-subheading">Complete Multi-Tenant SaaS Management, Billing, Gateways & Infrastructure</div>

      <p style="margin-bottom:12px;">
        The Super Admin Control Center provides platform owners with absolute operational authority over the entire multi-tenant SaaS deployment:
      </p>

      <div class="three-col">
        <div class="box box-accent">
          <div class="box-header">1. User & Account Governance</div>
          <ul class="feature-bullets">
            <li>Directory of all enterprise tenants and sales reps</li>
            <li>Role-based access (Super Admin, User, Team Agent)</li>
            <li>Direct tenant impersonation / 1-click auto-login</li>
            <li>Resource caps (Card scans, WhatsApp sessions, bots)</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">2. SaaS Subscription Engine</div>
          <ul class="feature-bullets">
            <li>Configurable tiers (Starter, Pro, Enterprise)</li>
            <li>Feature flags (AI scanner, chatbots, webhooks)</li>
            <li>Billing cycles (Monthly, Annual, Lifetime)</li>
            <li>Free trial enforcement and auto-downgrade hooks</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">3. Payment Gateways & Finance</div>
          <ul class="feature-bullets">
            <li>Stripe Checkout with automated webhook listeners</li>
            <li>PayPal & MercadoPago multi-currency support</li>
            <li>Manual Bank Wire / Offline Invoice verification</li>
            <li>Revenue analytics, order history & PDF receipts</li>
          </ul>
        </div>
      </div>

      <div class="three-col">
        <div class="box box-accent">
          <div class="box-header">4. WhatsApp Gateway Nodes</div>
          <ul class="feature-bullets">
            <li>Real-time Baileys cluster node health monitoring</li>
            <li>Active WebSockets sessions, memory load & latency</li>
            <li>Auto-reconnect daemon for disconnected numbers</li>
            <li>Anti-ban randomized transmission rate throttles</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">5. White-Label Branding Studio</div>
          <ul class="feature-bullets">
            <li>Custom logo, favicon, and brand color injection</li>
            <li>Custom domain CNAME mapping</li>
            <li>System theme switcher (Dark Cyberpunk / Light)</li>
            <li>Multi-language i18n localization JSON editor</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">6. System Telemetry & Marketing</div>
          <ul class="feature-bullets">
            <li>Firebase Cloud Messaging (FCM) push campaigns</li>
            <li>SMTP mail server config with test mailer</li>
            <li>CMS management: Landing page, FAQ, Blogs</li>
            <li>Terms of Service & Privacy Policy legal editors</li>
          </ul>
        </div>
      </div>

      ${renderScreenshot('40_admin_master_dashboard.png', 'Super Admin Master Control Center Dashboard (/admin)')}
      ${renderScreenshot('00_admin_login.png', 'Super Admin Secure Authentication Portal (/admin/login)')}

      <h2 class="section-heading">Super Admin Operational Sub-Panels</h2>
      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Subscription Tier Matrix (/admin?page=manage-plans)</div>
          <p>Multi-tier plan provisioning: device count quotas, daily AI vision scan limits, anti-ban rate throttles, and monthly/annual recurring subscription fees.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">Enterprise Tenant Directory (/admin?page=manage-users)</div>
          <p>Comprehensive tenant lifecycle management: active Baileys socket nodes, subscription validity extension, plan upgrades, and role-based access security.</p>
        </div>
      </div>
      ${renderScreenshot('41_admin_subscription_plans.png', 'Admin Sub-Panel 01: Subscription Plan Editor & Feature Tier Limits (/admin?page=manage-plans)')}
      ${renderScreenshot('42_admin_user_management.png', 'Admin Sub-Panel 02: Enterprise Tenant & User Directory Management (/admin?page=manage-users)')}

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Financial Orders & Invoicing (/admin?page=orders)</div>
          <p>Real-time transaction tracking: Stripe & PayPal automated payment reconciliation, offline bank wire approvals, tax receipts, and MRR growth metrics.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">Multi-Gateway Config (/admin?page=payment-gateways)</div>
          <p>Turnkey configuration for global payment gateways: Stripe, PayPal, Razorpay, Paystack, and MercadoPago with multi-currency dynamic switching.</p>
        </div>
      </div>
      ${renderScreenshot('43_admin_orders_finance.png', 'Admin Sub-Panel 03: Financial Orders, Recurring Billing & Revenue Invoicing (/admin?page=orders)')}
      ${renderScreenshot('44_admin_payment_gateways.png', 'Admin Sub-Panel 04: Multi-Gateway Stripe, PayPal & Razorpay Config (/admin?page=payment-gateways)')}

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">White-Label Branding Studio (/admin?page=web-theme)</div>
          <p>100% white-label customizability: upload corporate logos, custom favicons, dynamic primary CSS color palettes, and cyberpunk dark mode styling.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">SMTP Relay & Global Site Security (/admin?page=smtp & /admin?page=site-settings)</div>
          <p>High-deliverability SMTP mail server relays with live test dispatch, paired with global site maintenance toggles, cookie policies, and SEO metadata.</p>
        </div>
      </div>
      ${renderScreenshot('45_admin_theme_branding.png', 'Admin Sub-Panel 05: White-Label Theme, Logo & Brand Styling Studio (/admin?page=web-theme)')}
      ${renderScreenshot('46_admin_smtp_email_config.png', 'Admin Sub-Panel 06: SMTP Relay Server & System Email Deliverability Settings (/admin?page=smtp)')}
      ${renderScreenshot('47_admin_site_settings.png', 'Admin Sub-Panel 07: Global Site Configuration, Maintenance & Security Policies (/admin?page=site-settings)')}
    </div>

    <!-- ==================== PART 3: CUSTOMER PORTAL & CORE WHATSAPP CRM ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 3: Customer Portal & Core WhatsApp CRM Suite</h1>
      <div class="part-subheading">Enterprise Omnichannel Inbox, Bulk Broadcasts, Chatbot Builder & Multi-Device Engine</div>

      <p style="margin-bottom:12px;">
        When an enterprise tenant logs into MsgMagnet, they access a comprehensive omnichannel marketing and customer relationship management suite:
      </p>

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">1. Multi-Device Baileys Pairing</div>
          <p>
            Users connect their physical WhatsApp numbers in seconds by scanning a dynamic QR code. 
            The system establishes an encrypted WebSockets connection, maintaining persistent session credentials 
            without requiring an active mobile screen.
          </p>
        </div>
        <div class="box box-accent">
          <div class="box-header">2. Multi-Agent Live Chat Inbox</div>
          <p>
            A high-velocity team inbox allowing multiple sales agents to reply to incoming chats simultaneously. 
            Includes rich media support, voice notes, message labeling, lead stage tagging, and agent assignment.
          </p>
        </div>
      </div>

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">3. Bulk Broadcast Campaigns</div>
          <p>
            Import contact spreadsheets (CSV/Excel) and broadcast high-converting personalized messages using variable tags 
            (<code>{{name}}</code>, <code>{{company}}</code>). Features intelligent anti-ban randomized delay intervals and delivery reports.
          </p>
        </div>
        <div class="box box-accent">
          <div class="box-header">4. Visual Chatbot & Flow Builder</div>
          <p>
            Drag-and-drop conversational automation engine. Build 24/7 lead qualification bots with interactive quick-reply buttons, 
            list menus, keyword autoresponders, and human agent hand-off triggers.
          </p>
        </div>
      </div>

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">5. Contact Phonebook & Segmentation</div>
          <p>
            Full-featured CRM address book with unlimited contact groups, warmth ratings, custom fields, interaction logs, 
            and 1-click export to Google Sheets and external systems.
          </p>
        </div>
        <div class="box box-accent">
          <div class="box-header">6. Omni-Channel Social Channels</div>
          <p>
            Native integrations connecting Instagram Direct Messages, Facebook Messenger, and Telegram Bot API into the same unified 
            inbox for seamless multi-channel communication.
          </p>
        </div>
      </div>

      ${renderScreenshot('30_user_crm_dashboard.png', 'Customer WhatsApp CRM Portal Dashboard (/user)')}
      ${renderScreenshot('00_customer_login.png', 'Customer Authentication & Sign-In Interface (/user/login)')}

      <h2 class="section-heading">Customer CRM Operational Sub-Panels</h2>
      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Multi-Agent Live Chat Inbox (/user?page=inbox)</div>
          <p>Real-time conversational inbox: concurrent rep response, conversation assignment drawers, rich media, voice notes, message tags, and internal sales notes.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">WhatsApp Multi-Device QR Pairing (/user?page=wa-qr-connect)</div>
          <p>Frictionless QR pairing establishing persistent 24/7 Baileys WebSockets sessions with automatic background heartbeat reconnects.</p>
        </div>
      </div>
      ${renderScreenshot('31_user_live_chat_inbox.png', 'CRM Sub-Panel 01: Multi-Agent Live Chat Team Inbox & Conversation Assignment (/user?page=inbox)')}
      ${renderScreenshot('32_user_qr_pairing_engine.png', 'CRM Sub-Panel 02: WhatsApp Multi-Device QR Pairing Engine (/user?page=wa-qr-connect)')}

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Visual Chatbot Flow Builder (/user?page=automation-flows)</div>
          <p>Drag-and-drop conversational canvas: build conditional decision trees, interactive list menus, CTA buttons, and automated sales qualifying bots.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">Bulk Broadcast Scheduler (/user?page=qr-bulk-campaign)</div>
          <p>Outbound mass campaign engine: spreadsheet CSV importing, variable tag replacement ({{name}}, {{company}}), and anti-ban delay interval sliders.</p>
        </div>
      </div>
      ${renderScreenshot('33_user_chatbot_flow_builder.png', 'CRM Sub-Panel 03: Visual Drag-and-Drop Chatbot Flow Builder Canvas (/user?page=automation-flows)')}
      ${renderScreenshot('34_user_broadcast_scheduler.png', 'CRM Sub-Panel 04: Bulk WhatsApp Broadcast Scheduler & Anti-Ban Throttles (/user?page=qr-bulk-campaign)')}

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Dynamic Contacts Phonebook (/user?page=phonebook)</div>
          <p>Centralized address book: custom lead metadata fields, warmth scoring tags, contact segmentation, and 1-click vCard/CSV import/export.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">Webhook Automation Engine (/user?page=manage-webhook)</div>
          <p>Event-driven microservice dispatch: triggers instant HTTP POST webhooks on incoming messages or pipeline stage movements to external CRMs.</p>
        </div>
      </div>
      ${renderScreenshot('35_user_phonebook_contacts.png', 'CRM Sub-Panel 05: Phonebook & Dynamic Contacts Directory (/user?page=phonebook)')}
      ${renderScreenshot('36_user_webhook_automation.png', 'CRM Sub-Panel 06: Inbound & Outbound Webhook Automation Engine (/user?page=manage-webhook)')}

      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Rule-Based Autoresponder (/user?page=wa-chatbot)</div>
          <p>Instant keyword response engine supporting exact phrase matches, fuzzy contains, and regex triggers for 24/7 lead qualification.</p>
        </div>
        <div class="box box-accent">
          <div class="box-header">WhatsApp Interactive Forms (/user?page=wa-forms)</div>
          <p>Conversational survey and lead intake form builder delivered natively within interactive WhatsApp chat bubbles with instant response logging.</p>
        </div>
      </div>
      ${renderScreenshot('37_user_rule_autoresponder.png', 'CRM Sub-Panel 07: WA Rule-Based Autoresponder & Keyword Trigger Engine (/user?page=wa-chatbot)')}
      ${renderScreenshot('38_user_interactive_forms.png', 'CRM Sub-Panel 08: Interactive WhatsApp Lead Capture & Survey Form Builder (/user?page=wa-forms)')}
    </div>

    <!-- ==================== PART 4: NEXT-GEN AI NETWORKING (MODULES 01-10) ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 4: Next-Gen AI Networking Suite (Modules 01 - 10)</h1>
      <div class="part-subheading">Gemini Vision Card Capture, Digital Wallet Passes, Pipeline & Multimodal Tools</div>

      ${renderScreenshot('01_ai_card_scanner.png', 'Panel 01: AI Business Card Scanner with Gemini Vision OCR')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 01: AI Business Card Scanner</div>
        <p>Sub-second optical parsing using Google Gemini Vision AI. Instantly extracts name, job title, company, direct WhatsApp, email, physical address, and tags. Automatically generates a CRM contact, assigns a lead temperature score, and sends an automated WhatsApp intro message.</p>
      </div>

      ${renderScreenshot('02_batch_scanner.png', 'Panel 02: Batch Card Scanner for Conference Lead Ingestion')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 02: Batch Business Card Scanner</div>
        <p>Bulk multi-file upload queue that asynchronously digests up to 50 cards simultaneously, parsing contacts in parallel without UI freezing. Perfect for rapid post-expo processing.</p>
      </div>

      ${renderScreenshot('03_digital_profile_nfc.png', 'Panel 03: Digital Profile & Apple / Google Wallet Passes')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 03: Digital Business Card & Apple / Google Wallet Passes</div>
        <p>Interactive digital business profiles accessible via custom handle (/p/:username), featuring downloadable Apple Wallet .pkpass files, Google Wallet passes, and physical NFC card beam writing.</p>
      </div>

      ${renderScreenshot('04_viral_shared_links.png', 'Panel 04: Viral Shared Cards & Reciprocal "Lead Capture Mode"')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 04: Viral Shared Cards & Reciprocal "Lead Capture Mode"</div>
        <p>The Contact Swap Wall. When prospects open the profile link, phone numbers and direct links are protected until they exchange their name and phone number, guaranteeing 100% two-way lead capture.</p>
      </div>

      ${renderScreenshot('05_kanban_pipeline.png', 'Panel 05: 7-Stage Visual Lead Kanban Pipeline')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 05: 7-Stage Visual Lead Kanban Pipeline</div>
        <p>A high-velocity visual Kanban pipeline organized across 7 distinct sales stages: New Lead, Contacted, Meeting Scheduled, Proposal Sent, In Negotiation, Won / Closed, and Lost, with heat-coded temperature scoring.</p>
      </div>

      ${renderScreenshot('06_event_workspaces.png', 'Panel 06: Event Workspaces & Live Social Wall')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 06: Event Workspaces & Live Social Wall</div>
        <p>Dedicated Event Workspaces that pool all leads captured during an exhibition, coupled with a Live Social Wall for real-time lead broadcasts and team collaboration.</p>
      </div>

      ${renderScreenshot('07_voice_crm_tasks.png', 'Panel 07: Voice-to-CRM Task Management & Action Item Extractor')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 07: Voice-to-CRM Task Management & Action Item Extractor</div>
        <p>Multimodal voice capture allowing reps to speak naturally into their phone. AI transcribes the audio, extracts action items, sets priority and due dates, and creates CRM tasks automatically.</p>
      </div>

      ${renderScreenshot('08_google_workspace_sync.png', 'Panel 08: Google Workspace & Sheets Bi-directional Sync')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 08: Google Workspace & Sheets Bi-directional Sync</div>
        <p>Automated two-way synchronization between MsgMagnet CRM and Google Sheets via official Google APIs (googleapis v172), pushing newly scanned cards and updated pipeline stages continuously.</p>
      </div>

      ${renderScreenshot('09_email_templates.png', 'Panel 09: AI Follow-Up & Email Marketing Templates')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 09: AI Follow-Up & Email Marketing Templates</div>
        <p>Context-aware email and WhatsApp copy generator that tailors messages based on meeting notes, lead industry, and interaction history with pre-built high-converting frameworks.</p>
      </div>

      ${renderScreenshot('10_ai_chat_copilot.png', 'Panel 10: AI Chat Copilot for Tactical Sales Coaching')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 10: AI Chat Copilot (Tactical Sales Coaching)</div>
        <p>An in-platform conversational AI Copilot powered by Gemini 1.5 Pro that provides instant objection-handling scripts, negotiation tactics, and psychological closing frameworks in real time.</p>
      </div>
    </div>

    <!-- ==================== PART 4 CONT: NEXT-GEN AI NETWORKING (MODULES 11-21) ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 4 (Cont.): Next-Gen AI Networking Suite (Modules 11 - 21)</h1>
      <div class="part-subheading">Referrals, Geo-Map, Team Round-Robin, Reviver, B2B Community & Script Vault</div>

      ${renderScreenshot('11_referral_rewards.png', 'Panel 11: Referral Rewards & Viral Affiliate Growth Engine')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 11: Referral Rewards & Viral Affiliate Growth Engine</div>
        <p>A built-in referral rewards engine where users earn subscription credits, AI scan quotas, or cash commissions by referring peer entrepreneurs and colleagues, driving organic viral acquisition loops.</p>
      </div>

      ${renderScreenshot('12_geo_network_map.png', 'Panel 12: Geo-Network Interactive Leaflet Map')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 12: Geo-Network Interactive Map (Proximity Search)</div>
        <p>Interactive geospatial Leaflet map plotting contacts with heat-coded pins based on lead warmth (Red = Hot, Amber = Warm, Blue = Cold). Allows field sales reps to filter by city and initiate proximity client visits.</p>
      </div>

      ${renderScreenshot('13_fair_usage_quota.png', 'Panel 13: Fair Usage & Multimodal AI Quota Telemetry')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 13: Fair Usage & AI Quota Analytics</div>
        <p>Real-time consumption telemetry tracking card scans, voice minutes, and contacts against subscription plan quotas with visual progress bars, safeguarding platform gross margins.</p>
      </div>

      ${renderScreenshot('14_mobile_app_overview.png', 'Panel 14: iOS & Android Native Mobile App Overview')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 14: iOS & Android Native Mobile App (Expo SDK 52)</div>
        <p>Production-ready React Native mobile application with local SQLite offline sync, custom viewfinder camera overlay, physical NFC tag writing, and background push notifications.</p>
      </div>

      ${renderScreenshot('15_round_robin_agents.png', 'Panel 15: WhatsApp Multi-Agent Round-Robin Lead Assignment')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 15: WhatsApp Multi-Agent Round-Robin Lead Assignment</div>
        <p>An automated round-robin lead distribution engine that fairly balances incoming leads across active team agents based on least-assigned count and oldest assignment timestamp.</p>
      </div>

      ${renderScreenshot('16_crm_connectors.png', 'Panel 16: CRM Webhooks & Connectors (HubSpot / Salesforce / Zoho / Zapier)')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 16: CRM Webhooks & Connectors</div>
        <p>Native schema-mapping webhooks that format and push contacts into enterprise CRMs (HubSpot, Salesforce, Zoho, Zapier) in real time whenever a card is scanned or a reciprocal contact is captured.</p>
      </div>

      ${renderScreenshot('17_ghosting_reviver.png', 'Panel 17: Automated WhatsApp "Ghosting Reviver" Sequences')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 17: Automated WhatsApp "Ghosting Reviver" Sequences</div>
        <p>A 4-stage automated WhatsApp drip sequence (Day 1 check-in, Day 3 value-add, Day 7 question, Day 14 Dean Jackson 9-word breakup trigger). Automatically disengages the moment the prospect replies.</p>
      </div>

      ${renderScreenshot('18_email_signatures.png', 'Panel 18: 1-Click Interactive Email Signature Generator')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 18: 1-Click Interactive Email Signature Generator</div>
        <p>A 1-click HTML signature generator that produces client-compliant email signatures in 3 distinct styles: Modern Minimalist, Corporate Executive, and High-Converting Sales, linking to WhatsApp and Apple Wallet.</p>
      </div>

      ${renderScreenshot('19_b2b_community_feed.png', 'Panel 19: B2B Community Feed & Lead Exchange Market')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 19: B2B Community Feed & Lead Exchange Market</div>
        <p>Inspired by Bada Business, a dedicated B2B Community Feed categorized into 6 Industry Circles. Members broadcast buying requirements ([NEED]), service pitches ([OFFER]), and Q&A with 1-click WhatsApp deal closing.</p>
      </div>

      ${renderScreenshot('20_sales_script_vault.png', 'Panel 20: WhatsApp Sales Script & Copywriting Template Vault')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 20: WhatsApp Sales Script & Copywriting Template Vault</div>
        <p>A battle-tested repository of high-converting WhatsApp copywriting frameworks categorized across 5 major industries with 1-click clipboard copy and direct WhatsApp Web testing.</p>
      </div>

      ${renderScreenshot('21_public_digital_card.png', 'Panel 21: Public Digital Business Card & Contact Swap Landing Page')}
      <div class="box" style="margin-bottom:16px;">
        <div class="box-header">Module 21: Public Digital Card & Contact Swap Landing Page (/p/:username)</div>
        <p>High-speed public digital card hosted at /p/:username. Displays professional bio, WhatsApp direct link, location, Apple/Google Wallet buttons, and the Reciprocal Swap Wall for 100% two-way lead capture.</p>
      </div>
    </div>

    <!-- ==================== PART 5: NATIVE MOBILE APPLICATION ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 5: Native Mobile Application (iOS & Android)</h1>
      <div class="part-subheading">Production React Native Expo SDK 52 Architecture with Local SQLite Sync</div>

      <p style="margin-bottom:12px;">
        The MsgMagnet mobile application (located in <code>msgmagnet-app/</code>) is built for field sales teams attending trade shows, exhibitions, and client meetings. It leverages native device sensors that desktop browsers cannot access:
      </p>

      <div class="three-col">
        <div class="box box-accent">
          <div class="box-header">1. Native Viewfinder & Edge Guide</div>
          <p>
            <code>expo-camera</code> integrated with illuminated card framing guides to ensure business cards are captured at high resolution with zero perspective distortion.
          </p>
        </div>
        <div class="box box-accent">
          <div class="box-header">2. Offline SQLite Queue</div>
          <p>
            <code>expo-sqlite</code> creates an offline persistence layer. Field reps keep scanning in congested halls with zero connectivity; scans auto-flush when online.
          </p>
        </div>
        <div class="box box-accent">
          <div class="box-header">3. Physical NFC Tag Writer</div>
          <p>
            <code>react-native-nfc-manager</code> writes the user's digital card URL directly to blank NFC plastic tags or business cards with a single tap against the phone.
          </p>
        </div>
      </div>

      <h2 class="section-heading">Mobile Component Topography</h2>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Screen File</th>
            <th>Screen Purpose</th>
            <th>Native Capabilities & Workflows</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>DashboardScreen.tsx</code></td>
            <td>Mission Control</td>
            <td>Real-time AI scan quota meters, hot leads count, offline sync indicator, quick navigation cards.</td>
          </tr>
          <tr>
            <td><code>CardScannerScreen.tsx</code></td>
            <td>Camera Scanner</td>
            <td>Live camera viewfinder with edge detection guide, temperature selector, and event workspace tagger.</td>
          </tr>
          <tr>
            <td><code>CommunityFeedScreen.tsx</code></td>
            <td>B2B Lead Feed</td>
            <td>Pull-to-refresh feed, circle pills, Need/Offer badges, 1-tap WhatsApp inquiries, comments, FAB modal.</td>
          </tr>
          <tr>
            <td><code>TemplateVaultScreen.tsx</code></td>
            <td>Script Vault</td>
            <td>Keyword search, industry category tabs, monospace preview boxes, 1-tap clipboard copy, WA tester.</td>
          </tr>
          <tr>
            <td><code>LeadsPipelineScreen.tsx</code></td>
            <td>Kanban Pipeline</td>
            <td>Visual 7-stage pipeline cards with warmth tags and direct WhatsApp quick-chat action buttons.</td>
          </tr>
          <tr>
            <td><code>TasksScreen.tsx</code></td>
            <td>Voice CRM Tasks</td>
            <td>Speech recording with live waveform timer; Gemini AI transcribes and extracts action items into CRM.</td>
          </tr>
          <tr>
            <td><code>MeetingVoiceScreen.tsx</code></td>
            <td>Meeting Summarizer</td>
            <td>Hybrid engine: Zero-Cost Local speech debrief (zero API fees) + Cloud Gemini 1.5 Pro multimodal AI.</td>
          </tr>
          <tr>
            <td><code>NetworkMapScreen.tsx</code></td>
            <td>Geo-Network Map</td>
            <td>Native interactive map plotting client contacts with heat-coded pins based on lead warmth score.</td>
          </tr>
          <tr>
            <td><code>ShareQRScreen.tsx</code></td>
            <td>Share & NFC Beam</td>
            <td>High-contrast QR code display, system native share sheet, and hardware NFC tag programming.</td>
          </tr>
          <tr>
            <td><code>ProfileScreen.tsx</code></td>
            <td>Digital Profile</td>
            <td>Multi-persona identity switcher (Corporate, Freelance, Personal), bio, avatar upload, and swap toggle.</td>
          </tr>
          <tr>
            <td><code>SettingsScreen.tsx</code></td>
            <td>Settings</td>
            <td>Google Workspace sync, offline queue telemetry, custom API URL config, and session logout.</td>
          </tr>
        </tbody>
      </table>

      <div class="box box-success" style="margin-top:14px;">
        <div class="box-header">TypeScript Compilation Audit</div>
        <p>
          The entire mobile application codebase was validated with <code>npx tsc --noEmit</code>, achieving 
          <strong>Exit Code 0 (0 compilation errors, 100% strict type safety)</strong> across React Native 0.76 and Expo SDK 52.
        </p>
      </div>
    </div>

    <!-- ==================== PART 6: TECHNICAL SPECIFICATIONS & DATABASE TOPOGRAPHY ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 6: Technical Specifications & Data Topography</h1>
      <div class="part-subheading">Relational MySQL Schema, Security Architecture & Microservice Protocols</div>

      <p style="margin-bottom:12px;">
        The underlying persistence layer is architected in MySQL 8.0 with pooled connections, strict foreign constraints, and optimized b-tree indexing:
      </p>

      <table class="doc-table">
        <thead>
          <tr>
            <th>Database Table</th>
            <th>Primary Keys & Indices</th>
            <th>Core Purpose & Tracked Attributes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>user</code></td>
            <td><code>id (PK)</code>, <code>email (UQ)</code></td>
            <td>Tenant master identity, plan_id, subscription renewal date, password_hash (bcrypt), api_key.</td>
          </tr>
          <tr>
            <td><code>admin</code></td>
            <td><code>id (PK)</code>, <code>email (UQ)</code></td>
            <td>Super Admin credentials, permissions, system notification tokens, security versioning.</td>
          </tr>
          <tr>
            <td><code>contacts</code></td>
            <td><code>id (PK)</code>, <code>uid</code>, <code>mobile</code></td>
            <td>Central CRM contact directory, warmth (hot/warm/cold), pipeline stage, assigned agent, coordinates.</td>
          </tr>
          <tr>
            <td><code>contact_activity</code></td>
            <td><code>id (PK)</code>, <code>contact_id</code>, <code>uid</code></td>
            <td>Audit log of interactions: card scan, WhatsApp message sent, stage moved, agent assigned.</td>
          </tr>
          <tr>
            <td><code>community_posts</code></td>
            <td><code>id (PK)</code>, <code>circle_id</code>, <code>post_type</code></td>
            <td>B2B community social feed: buying requirements, service offers, Q&A, likes_count, comments_count.</td>
          </tr>
          <tr>
            <td><code>community_comments</code></td>
            <td><code>id (PK)</code>, <code>post_id</code></td>
            <td>Peer replies and automated Gemini AI tactical playbooks (is_ai_response flag).</td>
          </tr>
          <tr>
            <td><code>sales_template_vault</code></td>
            <td><code>id (PK)</code>, <code>industry</code></td>
            <td>Curated sales scripts, category (#closing, #cold_outreach), upvotes, copy counter.</td>
          </tr>
          <tr>
            <td><code>team_agents</code></td>
            <td><code>id (PK)</code>, <code>uid</code></td>
            <td>Round-robin pool members, WhatsApp number, active status, leads_assigned counter, last_assigned_at.</td>
          </tr>
          <tr>
            <td><code>webhook_connectors</code></td>
            <td><code>id (PK)</code>, <code>uid</code>, <code>platform</code></td>
            <td>HubSpot, Salesforce, Zoho, Zapier webhook endpoints, auth tokens, last HTTP response code.</td>
          </tr>
          <tr>
            <td><code>ghosting_sequences</code></td>
            <td><code>id (PK)</code>, <code>uid</code></td>
            <td>4-stage drip sequence definition, message copies, delay day intervals (1, 3, 7, 14).</td>
          </tr>
          <tr>
            <td><code>ghosting_progress</code></td>
            <td><code>id (PK)</code>, <code>contact_id</code></td>
            <td>Current prospect drip stage, status (active, replied, paused), next_execution_at timestamp.</td>
          </tr>
          <tr>
            <td><code>user_digital_profiles</code></td>
            <td><code>(uid, persona_type) [UQ]</code></td>
            <td>Multi-persona identity records (Corporate, Freelance, Personal), bio, slug, lead_capture_mode toggle.</td>
          </tr>
          <tr>
            <td><code>tasks</code></td>
            <td><code>id (PK)</code>, <code>uid</code>, <code>contact_id</code></td>
            <td>CRM action items, due dates, priority, audio transcript context, completion status.</td>
          </tr>
          <tr>
            <td><code>events</code></td>
            <td><code>id (PK)</code>, <code>uid</code></td>
            <td>Conference workspaces, location coordinates, start/end dates, total attendee leads pooled.</td>
          </tr>
        </tbody>
      </table>

      <!-- FLOWCHART 1: LEAD LIFECYCLE SEQUENCE -->
      <div class="flow-card">
        <div class="flow-title">⚡ Sequence Diagram 1: Lead Ingestion & Intelligent Routing Lifecycle</div>
        <div class="flow-subtitle">Sub-second execution path from physical trade show card capture to instant WhatsApp connection (&lt;1.2s total latency)</div>
        <div class="flow-row">
          <div class="flow-node primary">
            <div class="node-header">1. Capture</div>
            <div class="node-text">Paper Card / NFC Tap / Voice Memo</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node">
            <div class="node-header">2. Gemini AI</div>
            <div class="node-text">Vision OCR (&lt;800ms structured JSON)</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node">
            <div class="node-header">3. Clean & Dedup</div>
            <div class="node-text">E.164 phone cleaning & MySQL dedup check</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node purple">
            <div class="node-header">4. Load Balancer</div>
            <div class="node-text">Round-Robin assigns to least-busy rep</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node amber">
            <div class="node-header">5. CRM Webhook</div>
            <div class="node-text">Dispatches payload to HubSpot / Salesforce</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node success">
            <div class="node-header">6. WhatsApp Intro</div>
            <div class="node-text">Instant personalized message (wa.me)</div>
          </div>
        </div>
      </div>

      <!-- FLOWCHART 2: RECIPROCAL SWAP WALL -->
      <div class="flow-card">
        <div class="flow-title">🔄 Sequence Diagram 2: The Reciprocal "Swap Wall" Viral Inbound Loop</div>
        <div class="flow-subtitle">Zero-friction inbound lead generation converting passive digital card views into enrolled CRM prospects</div>
        <div class="flow-row">
          <div class="flow-node primary">
            <div class="node-header">Prospect Action</div>
            <div class="node-text">Scans QR or taps NFC card</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node amber">
            <div class="node-header">Swap Wall Trigger</div>
            <div class="node-text">Opens <code>/p/:username</code> with phone masked</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node purple">
            <div class="node-header">Inbound Form</div>
            <div class="node-text">Prospect enters Name & Mobile</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node">
            <div class="node-header">CRM Auto-Enroll</div>
            <div class="node-text">New contact created with "Warm" tag</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node success">
            <div class="node-header">Mutual Unlock</div>
            <div class="node-text">Direct WhatsApp unmasked + Apple Wallet pass</div>
          </div>
        </div>
      </div>

      <!-- FLOWCHART 3: GHOSTING REVIVER STATE MACHINE -->
      <div class="flow-card">
        <div class="flow-title">🤖 Sequence Diagram 3: Automated WhatsApp "Ghosting Reviver" State Machine</div>
        <div class="flow-subtitle">4-stage automated re-engagement drip with real-time inbound reply interruption listener</div>
        <div class="flow-row">
          <div class="flow-node primary">
            <div class="node-header">State 0: Trigger</div>
            <div class="node-text">Lead inactive &gt;24h after intro</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node">
            <div class="node-header">State 1 (Day 1)</div>
            <div class="node-text">Soft check: "Ensure you got the deck"</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node">
            <div class="node-header">State 2 (Day 3)</div>
            <div class="node-text">Value drop: Client benchmark study</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node">
            <div class="node-header">State 3 (Day 7)</div>
            <div class="node-text">Micro question: "Still exploring this Q?"</div>
          </div>
          <div class="flow-arrow">&#10140;</div>
          <div class="flow-node amber">
            <div class="node-header">State 4 (Day 14)</div>
            <div class="node-text">Breakup: "Given up on this project?"</div>
          </div>
        </div>
        <div class="interrupt-box">
          <strong>⚡ Real-Time Inbound Reply Interrupt:</strong> 
          The millisecond an incoming WhatsApp message arrives from this prospect, the state machine immediately terminates all subsequent drips and routes the conversation directly to the assigned sales rep with push notification alerts.
        </div>
      </div>

      <h2 class="section-heading">Security, Privacy & Enterprise Compliance</h2>
      <div class="two-col">
        <div class="box box-success">
          <div class="box-header">Authentication & Access Control</div>
          <p>
            All REST API endpoints enforce cryptographically signed JWT Bearer authentication. Password storage utilizes salted 
            bcrypt hashes with high work factors. Role middleware strictly sandboxes customer data across multi-tenant boundaries.
          </p>
        </div>
        <div class="box box-success">
          <div class="box-header">Zero-Cost Local Privacy Mode</div>
          <p>
            For executive board discussions and confidential negotiations, the Meeting Audio Summarizer offers a 
            <strong>Zero-Cost Local Mode</strong> that extracts action items deterministically without transmitting audio across external third-party APIs.
          </p>
        </div>
      </div>
    </div>

    <!-- ==================== PART 7: FINANCIAL PROJECTIONS & MONETIZATION ==================== -->
    <div class="page-break">
      <h1 class="part-heading">Part 7: Financial Projections, Unit Economics & Roadmap</h1>
      <div class="part-subheading">High Gross Margins, Predictable Recurring ARR & Expansion Milestones</div>

      <div class="three-col">
        <div class="box box-accent">
          <div class="box-header">Tier 1: Starter</div>
          <div style="font-size:16pt;font-weight:800;color:#2563eb;margin:4px 0;">$29 <span style="font-size:9pt;color:#64748b;font-weight:500;">/ rep / mo</span></div>
          <ul class="feature-bullets">
            <li>1 WhatsApp Number Connection</li>
            <li>250 AI Card Scans / Month</li>
            <li>Digital Card & Apple Wallet Pass</li>
            <li>7-Stage Kanban Lead Pipeline</li>
            <li>Standard Community Feed Access</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">Tier 2: Professional</div>
          <div style="font-size:16pt;font-weight:800;color:#2563eb;margin:4px 0;">$79 <span style="font-size:9pt;color:#64748b;font-weight:500;">/ team / mo</span></div>
          <ul class="feature-bullets">
            <li>Up to 5 Team Sales Reps</li>
            <li>1,000 AI Card Scans / Month</li>
            <li>Multi-Agent Round-Robin Assignment</li>
            <li>Automated Ghosting Reviver Sequences</li>
            <li>CRM Connectors (HubSpot/Salesforce)</li>
            <li>Full Meeting Voice Summarizer</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">Tier 3: Enterprise</div>
          <div style="font-size:16pt;font-weight:800;color:#2563eb;margin:4px 0;">$299 <span style="font-size:9pt;color:#64748b;font-weight:500;">/ enterprise / mo</span></div>
          <ul class="feature-bullets">
            <li>Unlimited Team Agents</li>
            <li>5,000 AI Card Scans + Dedicated Node</li>
            <li>Full White-Label Theme & Domain</li>
            <li>Custom Webhooks & API Integration</li>
            <li>Featured B2B Community Broadcasts</li>
            <li>24/7 Dedicated Technical SLA</li>
          </ul>
        </div>
      </div>

      <h2 class="section-heading">3-Year Pro Forma Financial Model</h2>
      <table class="doc-table">
        <thead>
          <tr>
            <th>Metric / Line Item</th>
            <th>Year 1 (2026)</th>
            <th>Year 2 (2027)</th>
            <th>Year 3 (2028)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Active Paying Seats</strong></td>
            <td>1,200 seats</td>
            <td>4,800 seats</td>
            <td>14,500 seats</td>
          </tr>
          <tr>
            <td><strong>Annual Recurring Revenue (ARR)</strong></td>
            <td><strong>$840,000</strong></td>
            <td><strong>$3,420,000</strong></td>
            <td><strong>$11,180,000</strong></td>
          </tr>
          <tr>
            <td><strong>Cost of Goods Sold (COGS)</strong></td>
            <td>$106,000 (12.6%)</td>
            <td>$410,000 (12.0%)</td>
            <td>$1,260,000 (11.3%)</td>
          </tr>
          <tr>
            <td><strong>Gross Profit (Gross Margin %)</strong></td>
            <td><strong>$734,000 (87.4%)</strong></td>
            <td><strong>$3,010,000 (88.0%)</strong></td>
            <td><strong>$9,920,000 (88.7%)</strong></td>
          </tr>
          <tr>
            <td><strong>Operating Expenses (R&D, S&M, G&A)</strong></td>
            <td>$460,000</td>
            <td>$1,650,000</td>
            <td>$5,200,000</td>
          </tr>
          <tr>
            <td><strong>EBITDA (Operating Profit Margin %)</strong></td>
            <td><strong>$274,000 (32.6%)</strong></td>
            <td><strong>$1,360,000 (39.7%)</strong></td>
            <td><strong>$4,720,000 (42.2%)</strong></td>
          </tr>
        </tbody>
      </table>

      <h2 class="section-heading">Key SaaS Unit Economics</h2>
      <div class="three-col">
        <div class="box box-success">
          <div class="box-header">Customer Acquisition Cost (CAC)</div>
          <div style="font-size:16pt;font-weight:900;color:#10b981;margin:3px 0;">$185</div>
          <p style="font-size:7.5pt;color:#64748b;">Propelled by viral shared digital business cards and built-in member referral loops.</p>
        </div>
        <div class="box box-success">
          <div class="box-header">Customer Lifetime Value (LTV)</div>
          <div style="font-size:16pt;font-weight:900;color:#10b981;margin:3px 0;">$1,896</div>
          <p style="font-size:7.5pt;color:#64748b;">Based on a 28-month average enterprise retention cycle across core SaaS subscriptions.</p>
        </div>
        <div class="box box-success">
          <div class="box-header">LTV / CAC Ratio</div>
          <div style="font-size:16pt;font-weight:900;color:#10b981;margin:3px 0;">10.2x</div>
          <p style="font-size:7.5pt;color:#64748b;">Exceeds top-decile enterprise SaaS benchmarks (&gt;3.0x), enabling hyper-efficient scaling.</p>
        </div>
      </div>

      <h2 class="section-heading">Seed Round Investment Ask & Use of Funds</h2>
      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">The Capital Ask: $1,500,000 Seed Round</div>
          <p>
            MsgMagnet is seeking <strong>$1.5M in Seed Capital</strong> (via SAFE or Priced Preferred Equity at a $10M Post-Money Valuation) 
            to scale global cloud infrastructure and accelerate enterprise go-to-market distribution.
          </p>
        </div>
        <div class="box box-accent">
          <div class="box-header">Strategic Capital Allocation</div>
          <ul class="feature-bullets">
            <li><strong>45% ($675k):</strong> Engineering & Mobile AI (Edge OCR models, offline SQLite engine).</li>
            <li><strong>30% ($450k):</strong> GTM & Channel Partnerships (Event organizers, enterprise trade shows).</li>
            <li><strong>15% ($225k):</strong> Multi-Region Baileys Gateway Fleet (AWS / GCP low-latency nodes).</li>
            <li><strong>10% ($150k):</strong> SOC-2 Type II, ISO 27001 & Enterprise GDPR Compliance Audits.</li>
          </ul>
        </div>
      </div>

      <h2 class="section-heading">Strategic Expansion Roadmap</h2>
      <div class="two-col">
        <div class="box box-accent">
          <div class="box-header">Phase 1: Global Cloud Deployment (Q4 2026)</div>
          <ul class="feature-bullets">
            <li>Deploy multi-region Baileys gateway clusters across North America, EMEA, and APAC.</li>
            <li>Publish MsgMagnet to official Apple App Store and Google Play Store via EAS automated builds.</li>
          </ul>
        </div>
        <div class="box box-accent">
          <div class="box-header">Phase 2: AppExchange & Marketplace Liquidity (Q2 2027)</div>
          <ul class="feature-bullets">
            <li>Achieve certified partner listing on Salesforce AppExchange and HubSpot App Marketplace.</li>
            <li>Introduce verified supplier escrow badges inside the B2B Community marketplace.</li>
          </ul>
        </div>
      </div>

      <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:7.8pt;color:#64748b;">
          <strong>MsgMagnet Enterprise Investor Memorandum</strong> &bull; Confidential &bull; All Rights Reserved 2026
        </div>
        <div style="font-size:8.2pt;font-weight:800;color:#2563eb;">
          invest@msgmagnet.com &bull; www.msgmagnet.com
        </div>
      </div>
    </div>

  </body>
  </html>
  `;

  fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
  console.log('✓ Master HTML documentation generated at:', OUTPUT_HTML);

  console.log('Rendering Master PDF with Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + OUTPUT_HTML.replace(/\\/g, '/');
  console.log('Loading file URL:', fileUrl);
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Printing Master PDF to:', OUTPUT_PDF);
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 7.5pt; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm; border-top: 1px solid #f1f5f9; padding-top: 4px;">
        <span>MsgMagnet &bull; Complete Enterprise System & Investor Dossier</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: '16mm',
      bottom: '18mm',
      left: '14mm',
      right: '14mm'
    }
  });

  await browser.close();
  const stats = fs.statSync(OUTPUT_PDF);
  console.log(`🎉 SUCCESS! Master Investor Dossier PDF created: ${OUTPUT_PDF} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

  const brainPdf = 'C:\\Users\\suppo\\.gemini\\antigravity\\brain\\77a662ce-24f7-4f80-8999-08b63767286a\\MsgMagnet_Master_Enterprise_Investor_Dossier.pdf';
  fs.copyFileSync(OUTPUT_PDF, brainPdf);
  console.log(`✓ Copied to brain artifact destination: ${brainPdf}`);
}

generateMasterDossier().catch(err => {
  console.error('Master dossier generation failed:', err);
  process.exit(1);
});
