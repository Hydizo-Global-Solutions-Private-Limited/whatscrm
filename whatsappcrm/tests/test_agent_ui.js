const fs = require('fs');

// Verify helper variables in main.d12aca39.js
const bundle = fs.readFileSync('client/public/static/js/main.d12aca39.js', 'utf8');

console.log('Dt.jsx exists:', bundle.includes('Dt.jsx'));
console.log('Dt.jsxs exists:', bundle.includes('Dt.jsxs'));
console.log('Vde exists:', bundle.includes('Vde='));
console.log('Hde exists:', bundle.includes('Hde='));
console.log('Xde exists:', bundle.includes('Xde='));
console.log('K4 exists:', bundle.includes('K4='));
console.log('Nce exists:', bundle.includes('Nce='));
console.log('J4 exists:', bundle.includes('J4='));
console.log('Kse exists:', bundle.includes('Kse='));
console.log('BN exists:', bundle.includes('BN='));
console.log('Z2 exists:', bundle.includes('Z2='));
