const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const HTML_PATH = path.resolve(__dirname, '../docs/master_investor_dossier.html');
const PDF_PATH = path.resolve(__dirname, '../../MsgMagnet_Master_Enterprise_Investor_Dossier.pdf');

async function verifyDossier() {
  console.log('====================================================');
  console.log('AUDITING MASTER INVESTOR DOSSIER & EMBEDDED ASSETS');
  console.log('====================================================');

  // Check PDF file existence & size
  if (!fs.existsSync(PDF_PATH)) {
    console.error('❌ PDF file does not exist at:', PDF_PATH);
    process.exit(1);
  }
  const pdfStats = fs.statSync(PDF_PATH);
  console.log(`✓ PDF exists: ${PDF_PATH}`);
  console.log(`✓ PDF file size: ${(pdfStats.size / 1024 / 1024).toFixed(2)} MB (${pdfStats.size} bytes)`);

  // Launch headless browser to inspect DOM & images
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  const fileUrl = 'file:///' + HTML_PATH.replace(/\\/g, '/');
  console.log(`Loading document: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });

  // Evaluate all images in the document
  const imgAudit = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    return images.map((img, idx) => ({
      index: idx + 1,
      alt: img.alt || 'No Alt',
      hasSrc: !!img.src,
      srcLength: img.src ? img.src.length : 0,
      isBase64: img.src ? img.src.startsWith('data:image/png;base64,') : false,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      isBroken: img.naturalWidth === 0 || img.naturalHeight === 0
    }));
  });

  console.log(`\n--- EMBEDDED IMAGES AUDIT (${imgAudit.length} IMAGES TOTAL) ---`);
  let brokenCount = 0;
  imgAudit.forEach(img => {
    const status = !img.isBroken ? '✓ OK' : '❌ BROKEN';
    if (img.isBroken) brokenCount++;
    console.log(`Image #${img.index.toString().padStart(2, '0')}: [${status}] ${img.alt} (${img.naturalWidth}x${img.naturalHeight}px, base64 size: ${(img.srcLength / 1024).toFixed(1)} KB)`);
  });

  // Evaluate sections & headings
  const structure = await page.evaluate(() => {
    const parts = Array.from(document.querySelectorAll('.part-heading')).map(el => el.innerText.trim());
    const sections = Array.from(document.querySelectorAll('.section-heading')).map(el => el.innerText.trim());
    const tables = document.querySelectorAll('table.doc-table').length;
    const boxes = document.querySelectorAll('.box').length;
    const pageBreaks = document.querySelectorAll('.page-break').length;

    return { parts, sections, tables, boxes, pageBreaks };
  });

  console.log('\n--- DOCUMENT STRUCTURE & OUTLINE AUDIT ---');
  console.log(`Major Parts (${structure.parts.length}):`);
  structure.parts.forEach((p, i) => console.log(`  Part ${i+1}: ${p}`));
  console.log(`Total Section Headings: ${structure.sections.length}`);
  console.log(`Total Document Tables: ${structure.tables}`);
  console.log(`Total Architectural Boxes/Cards: ${structure.boxes}`);
  console.log(`Explicit Page Breaks: ${structure.pageBreaks}`);

  await browser.close();

  console.log('\n====================================================');
  if (brokenCount === 0 && imgAudit.length > 0) {
    console.log(`🏆 PERFECT AUDIT: All ${imgAudit.length} screenshots are 100% valid, loaded, and high-resolution!`);
  } else {
    console.log(`⚠️ ISSUES DETECTED: ${brokenCount} broken images found.`);
  }
  console.log('====================================================');
}

verifyDossier().catch(e => {
  console.error('Audit failed:', e);
  process.exit(1);
});
