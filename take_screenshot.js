import puppeteer from 'puppeteer';
import path from 'path';

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Forward browser console logs to terminal
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.setViewport({ width: 1400, height: 1200 });

  console.log('Navigating to login page...');
  await page.goto('http://localhost:7173/login', { waitUntil: 'networkidle2' });

  console.log('Logging in...');
  await page.type('#username-input', 'admin');
  await page.type('#password-input', 'admin123');
  await page.click('button.login-submit');

  console.log('Waiting for URL change or elements...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check if there is an error element on the page
  const errorText = await page.evaluate(() => {
    const errEl = document.querySelector('.login-error');
    return errEl ? errEl.textContent : null;
  });
  if (errorText) {
    console.error('Login failed with error on page:', errorText);
  }

  console.log('Current URL after login attempt:', page.url());

  console.log('Navigating to trips page...');
  await page.goto('http://localhost:7173/trips', { waitUntil: 'networkidle2' });

  // Additional wait for React Query to load
  await new Promise(resolve => setTimeout(resolve, 4000));

  console.log('Current URL on trips page attempt:', page.url());

  const screenshotPath = '/Users/dev/.gemini/antigravity-cli/brain/283ad372-d4b7-450d-905f-063a73db4f5b/screenshot_trips.png';
  console.log(`Taking screenshot and saving to: ${screenshotPath}`);
  
  await page.screenshot({ path: screenshotPath, fullPage: false });

  console.log('Done!');
  await browser.close();
}

run().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
