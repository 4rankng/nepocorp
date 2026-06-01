const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Dump console errors
  page.on('console', msg => { if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text()); });
  page.on('pageerror', error => console.log('PAGE EXCEPTION:', error.message));

  console.log('Navigating to login...');
  await page.goto('http://localhost:7174/login', { waitUntil: 'networkidle2' });
  
  await page.type('#username-input', 'admin');
  await page.type('#password-input', 'admin123');
  await page.click('button.login-submit');
  
  console.log('Waiting for navigation to finish login...');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });
  
  console.log('Navigating to routes config...');
  await page.goto('http://localhost:7174/config/routes', { waitUntil: 'networkidle2' });
  
  console.log('Clicking Thêm tuyến...');
  const buttons = await page.$$('button.btn--primary');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm tuyến')) {
      await btn.click();
      break;
    }
  }
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Find modal and click Thêm tuyến inside it
  console.log('Looking for modal and inputs...');
  const nameInput = await page.$('input#route-name');
  if (nameInput) {
    console.log('Found modal! Typing "Test route"');
    await nameInput.type('Test route');
    
    // Attempt click on Save button in Modal footer
    const modalButtons = await page.$$('button');
    for (const btn of modalButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.trim() === 'Thêm tuyến') {
        console.log('Clicking Thêm tuyến inside modal...');
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('page_after_save.txt', html);
  } else {
    console.log('Modal did not appear! Dumping HTML...');
    const html = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('page_no_modal.txt', html);
  }

  await browser.close();
})();
