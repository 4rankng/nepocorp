const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:7173/login', { waitUntil: 'networkidle0', timeout: 30000 });
  const inputs = await page.evaluate(() => Array.from(document.querySelectorAll('input')).map(i => ({ name: i.name, type: i.type, ph: i.placeholder, id: i.id })));
  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => ({ type: b.type, text: (b.textContent||'').trim().slice(0,40) })));
  console.log('INPUTS:', JSON.stringify(inputs, null, 2));
  console.log('BUTTONS:', JSON.stringify(buttons, null, 2));
  await browser.close();
})();
