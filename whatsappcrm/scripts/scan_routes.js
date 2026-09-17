const fs = require('fs');

const code = fs.readFileSync('client/public/static/js/main.d12aca39.js', 'utf8');

// Search for route paths like path:"/something" or path:'/something'
const regex = /path:\s*["'](\/[a-zA-Z0-9_\-\/:]*)["']/g;
const found = new Set();
let match;
while ((match = regex.exec(code)) !== null) {
  found.add(match[1]);
}

console.log('--- FRONTEND REACT ROUTES ---');
console.log(Array.from(found).sort());
