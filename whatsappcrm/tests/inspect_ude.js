const fs = require('fs');
const content = fs.readFileSync('client/public/static/js/main.d12aca39.js', 'utf8');
const uStart = content.indexOf('Ude=');
const xStart = content.indexOf('Xde=');
console.log('--- Ude chunk ---');
console.log(content.substring(uStart, xStart));
