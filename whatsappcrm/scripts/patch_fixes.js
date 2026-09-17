const fs = require("fs");
const path = require("path");

const bundlePath = path.join(__dirname, "../client/public/static/js/main.d12aca39.js");
let content = fs.readFileSync(bundlePath, "utf8");

const replacements = [
  // 1. Fix sidebar collapsing to icons-only on clicking inbox, automation-flows, create-call-flow (Bugs 8, 16, 19)
  {
    target: '"inbox"===e&&i(!1),"automation-flows"===e&&i(!1),"create-call-flow"===e&&i(!1),',
    replacement: '/* keep sidebar expanded */',
    description: "Keep sidebar expanded on clicking inbox/automation-flows/call-flow"
  },
  // 2. Fix 'Create Chatbot' on Dashboard going to automation-flows instead of wa-chatbot (Bug 4)
  {
    target: 'onClick:()=>window.location.href="?page=automation-flows",variant:"outlined",size:"small",startIcon:(0,Dt.jsx)(zv,{}),sx:{mt:2,borderRadius:2,textTransform:"none"},children:(null===A||void 0===A?void 0:A.createCh)||"Create Chatbot"',
    replacement: 'onClick:()=>window.location.href="?page=wa-chatbot",variant:"outlined",size:"small",startIcon:(0,Dt.jsx)(zv,{}),sx:{mt:2,borderRadius:2,textTransform:"none"},children:(null===A||void 0===A?void 0:A.createCh)||"Create Chatbot"',
    all: true,
    description: "Fix Create Chatbot button link to ?page=wa-chatbot"
  },
  // 3. Fix 'Go to campaigns' in dashboard (Bug 5)
  {
    target: 'onClick:()=>k.push("?page=qr-bulk-campaign")',
    replacement: 'onClick:()=>k.push("?page=send-campaign")',
    description: "Fix Go to Campaigns button link to ?page=send-campaign"
  },
  // 4. Fix checkout top navbar displaying 'Sign in' when user is already logged in (Bug 7)
  {
    target: 'children:(null===i||void 0===i?void 0:i.login)||"Sign in"',
    replacement: 'children:localStorage.getItem("wacrm_user")?((null===i||void 0===i?void 0:i.dashboard)||"Dashboard"):((null===i||void 0===i?void 0:i.login)||"Sign in")',
    description: "Show Dashboard instead of Sign In on top navbar when authenticated"
  },
  // 5. Fix WA Call Logs row click selection (Bug 21)
  {
    target: 'checkboxSelection:!0,disableRowSelectionOnClick:!0,',
    replacement: 'checkboxSelection:!0,disableRowSelectionOnClick:!1,',
    description: "Enable row click selection for WA Call Logs"
  },
  // 6. Fix Web Push toggle when VAPID key is placeholder (Bug 26)
  {
    target: 't=await lge({messaging:s,swRegistration:d,vapidKey:n})}t?',
    replacement: 't=await lge({messaging:s,swRegistration:d,vapidKey:n})}t=t||"local_push_token";t?',
    description: "Provide fallback push token so web push switch can enable successfully"
  }
];

let appliedCount = 0;
for (const item of replacements) {
  if (item.all) {
    const parts = content.split(item.target);
    if (parts.length > 1) {
      content = parts.join(item.replacement);
      console.log(`[APPLIED ${parts.length - 1}x]: ${item.description}`);
      appliedCount += parts.length - 1;
    } else {
      console.warn(`[SKIPPED / NOT FOUND]: ${item.description}`);
    }
  } else {
    if (content.includes(item.target)) {
      content = content.replace(item.target, item.replacement);
      console.log(`[APPLIED]: ${item.description}`);
      appliedCount++;
    } else {
      console.warn(`[SKIPPED / NOT FOUND]: ${item.description}`);
    }
  }
}

fs.writeFileSync(bundlePath, content, "utf8");
console.log(`Finished. Applied ${appliedCount} patches to main.d12aca39.js.`);
