const fs = require('fs');

const code = fs.readFileSync('client/public/static/js/main.d12aca39.js', 'utf8');

// Find all React router route definitions: path="..." or path:'...'
const regex = /path:\s*["']([^"']+)["']/g;
const found = new Set();
let match;
while ((match = regex.exec(code)) !== null) {
  const p = match[1];
  if (!p.startsWith('/api/') && !p.startsWith('http')) {
    found.add(p);
  }
}

console.log('--- UI FRONTEND PAGE ROUTES ---');
console.log(Array.from(found).sort());
