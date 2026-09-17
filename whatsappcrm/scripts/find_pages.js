const fs = require('fs');
const content = fs.readFileSync('c:/Users/Hydizo/Downloads/whatscrm-whatsapp-crm-ai-automation-and-multichannel-saas-bundle-nodejs-script/whatsappcrm/client/public/static/js/main.d12aca39.js', 'utf8');
const regex = /["']([a-z0-9_-]+)["']\s*===\s*[a-zA-Z0-9_$.]+|[a-zA-Z0-9_$.]+\s*===\s*["']([a-z0-9_-]+)["']/g;
let m;
const set = new Set();
while ((m = regex.exec(content)) !== null) {
  const val = m[1] || m[2];
  if (val && val.length > 2 && val.length < 30) set.add(val);
}
console.log('Detected page keys:', Array.from(set));
