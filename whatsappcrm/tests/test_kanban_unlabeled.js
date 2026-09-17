const fs = require('fs');
const acorn = require('acorn');

const bundlePath = 'client/public/static/js/main.d12aca39.js';
let bundle = fs.readFileSync(bundlePath, 'utf8');

// Boundaries:
const xgeStart = bundle.indexOf('Xge=e=>{');
const ygeStart = bundle.indexOf(',Yge=e=>{');
const zgeStart = bundle.indexOf(',Zge=e=>{');
const jgeStart = bundle.indexOf(',Jge=zi(');

console.log('xgeStart:', xgeStart, 'ygeStart:', ygeStart);
console.log('zgeStart:', zgeStart, 'jgeStart:', jgeStart);
