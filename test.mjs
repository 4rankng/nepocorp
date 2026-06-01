import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Navigate to routes page
  await page.goto('http://localhost:7174/config/routes', { waitUntil: 'networkidle2' });
  
  // Wait for the button
  await page.waitForSelector('button.btn--primary');
  
  // Take screenshot before click
  await page.screenshot({ path: 'before.png' });
  
  // Click "Thêm tuyến"
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.includes('Thêm tuyến')) {
      await btn.click();
      break;
    }
  }
  
  // Wait a bit
  await new Promise(r => setTimeout(r, 1000));
  
  // Take screenshot after click
  await page.screenshot({ path: 'after.png' });
  
  // Try to type in the form and submit
  try {
    const inputs = await page.$$('input[placeholder="VD: TP.HCM - Bình Dương"]');
    if (inputs.length > 0) {
      await inputs[0].type('Test Route');
      const saveBtns = await page.$$('button.btn--primary.btn--sm');
      for (const btn of saveBtns) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes('Thêm')) {
          await btn.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1000));
      await page.screenshot({ path: 'after_submit.png' });
    } else {
      console.log('No input found after click');
    }
  } catch (e) {
    console.error(e);
  }

  await browser.close();
})();
