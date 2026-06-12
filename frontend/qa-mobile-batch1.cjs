const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 375, height: 812, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  });

  // Login as director (phung)
  await page.goto('http://localhost:7173/', { waitUntil: 'networkidle0' });
  await page.waitForSelector('input', { timeout: 5000 });

  // Fill login form - use identifier field
  const allInputs = await page.$$('input');
  console.log('Found inputs:', allInputs.length);

  // Type into first input (identifier) and second input (password)
  await allInputs[0].click();
  await page.keyboard.type('phung');
  await allInputs[1].click();
  await page.keyboard.type('admin123');

  // Submit
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const url = page.url();
  console.log('After login URL:', url);

  // Screenshot Dashboard
  await page.goto('http://localhost:7173/dashboard', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/qa-01-dashboard.png', fullPage: true });
  console.log('1. Dashboard OK');

  // Screenshot Trip List
  await page.goto('http://localhost:7173/trips', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/qa-02-trips.png', fullPage: true });
  console.log('2. Trips OK');

  // Screenshot Trip Detail (trip 29)
  await page.goto('http://localhost:7173/trips/29', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/qa-03-trip-detail.png', fullPage: true });
  console.log('3. Trip Detail OK');

  // Screenshot Trip Create
  await page.goto('http://localhost:7173/trips/new', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/qa-04-trip-create.png', fullPage: true });
  console.log('4. Trip Create OK');

  // Screenshot Dispatch
  await page.goto('http://localhost:7173/dispatch', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/qa-05-dispatch.png', fullPage: true });
  console.log('5. Dispatch OK');

  // Screenshot Fleet
  await page.goto('http://localhost:7173/fleet', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/qa-06-fleet.png', fullPage: true });
  console.log('6. Fleet OK');

  await browser.close();
  console.log('All batch 1 screenshots captured!');
})();
