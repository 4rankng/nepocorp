import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Forward browser console logs to terminal
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));

  await page.setViewport({ width: 1400, height: 1200 });

  console.log('1. Navigating to login page...');
  await page.goto('http://localhost:7173/login', { waitUntil: 'networkidle2' });

  console.log('2. Logging in as giamdoc...');
  await page.type('#username-input', 'giamdoc');
  await page.type('#password-input', 'admin123');
  await page.click('button.login-submit');

  console.log('3. Waiting after login...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Current URL after login:', page.url());

  console.log('4. Navigating to Trip Create page...');
  await page.goto('http://localhost:7173/trips/new', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('Current URL on Trip Create page:', page.url());

  // Fill in the form fields.
  // The selects are:
  // - Customer (1st select)
  // - Route (2nd select)
  // - Cargo Type (3rd select)
  // - Truck (4th select)
  // - Trailer Type (5th select)
  // - Driver (6th select)
  
  console.log('5. Selecting options...');
  const selectData = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select.input'));
    return selects.map((sel, idx) => {
      const options = Array.from(sel.querySelectorAll('option'))
        .map(opt => ({ value: opt.value, text: opt.textContent }))
        .filter(opt => opt.value !== '');
      return { idx, placeholder: sel.querySelector('option')?.textContent, options };
    });
  });

  console.log('Select elements found:', JSON.stringify(selectData, null, 2));

  if (selectData.length < 6) {
    console.error('Error: Found fewer than 6 select fields on the trip create page!');
    await browser.close();
    process.exit(1);
  }

  // Choose the first valid option for each select
  for (let i = 0; i < 6; i++) {
    const data = selectData[i];
    if (data.options.length === 0) {
      console.error(`Error: Select index ${i} (${data.placeholder}) has no valid options!`);
      await browser.close();
      process.exit(1);
    }
    const val = data.options[0].value;
    console.log(`Selecting value "${val}" (${data.options[0].text}) for select index ${i} (${data.placeholder})`);
    
    await page.evaluate((idx, value) => {
      const selects = Array.from(document.querySelectorAll('select.input'));
      const select = selects[idx];
      select.value = value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }, i, val);
  }

  console.log('6. Setting departure date...');
  // Find date input and set it
  await page.evaluate(() => {
    const dateInput = document.querySelector('input[type="date"]');
    if (dateInput) {
      dateInput.value = '2026-06-02';
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      console.error('Date input not found!');
    }
  });

  console.log('7. Taking screenshot before submit...');
  await page.screenshot({ path: './scratch_trip_create_before.png' });

  console.log('8. Submitting form...');
  // Click actionbar submit button
  // Let's find button with text "Lưu" or similar, or class of the submit button in ActionBar
  const submitClicked = await page.evaluate(() => {
    // Look for submit button
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b => b.textContent.includes('Lưu') || b.textContent.includes('Tạo') || b.className.includes('submit'));
    if (saveBtn) {
      saveBtn.click();
      return true;
    }
    return false;
  });

  console.log('Submit button clicked:', submitClicked);
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('9. Checking resulting URL...');
  console.log('Resulting URL:', page.url());
  await page.screenshot({ path: './scratch_trip_create_after.png' });

  await browser.close();
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
