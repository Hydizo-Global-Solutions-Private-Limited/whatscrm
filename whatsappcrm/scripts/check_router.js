const fs = require('fs');
const code = fs.readFileSync('client/public/static/js/main.d12aca39.js', 'utf8');
const idx = code.indexOf('"automation-flows"===n');
console.log(code.substring(idx - 600, idx));
