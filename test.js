const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:7174/config/routes', { waitUntil: 'networkidle2' });
  await page.waitForSelector('button.btn--primary');
  
  // Dump all react errors or console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm tuyến')) {
      console.log('Clicking Thêm tuyến');
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  const html = await page.evaluate(() => document.body.innerHTML);
  const fs = require('fs');
  fs.writeFileSync('page_html.txt', html);
  console.log('Saved page_html.txt');

  await browser.close();
})();
