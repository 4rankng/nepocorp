const puppeteer = require('puppeteer-core');

const BASE = 'http://localhost:7173';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  const failedReqs = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('requestfailed', r => { failedReqs.push(`${r.url()} :: ${r.failure().errorText}`); });
  page.on('response', r => {
    const s = r.status();
    if (s >= 400) failedReqs.push(`${s} ${r.url()}`);
  });

  await page.setViewport({ width: 1440, height: 900 });
  // Login
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.type('#username-input', 'admin');
  await page.type('#password-input', 'admin123');
  await page.click('button[type="submit"]');
  try { await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }); }
  catch { /* SPA may not nav */ }
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'qa/screenshots/qa-01-dashboard.png' });
  console.log('After login URL:', page.url());

  // TripListPage — our polished page
  await page.goto(`${BASE}/trips`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'qa/screenshots/qa-02-trips.png', fullPage: false });
  // Check breadcrumbs rendered
  const crumbs = await page.evaluate(() => {
    const bc = document.querySelector('.d-breadcrumbs, .trip-list-page__crumbs');
    return bc ? bc.innerText.replace(/\n/g, ' | ') : 'NOT FOUND';
  });
  console.log('Breadcrumbs:', crumbs);

  // Finance page
  await page.goto(`${BASE}/finance`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'qa/screenshots/qa-03-finance.png' });

  // Open a modal to test the close-button tooltip
  await page.goto(`${BASE}/trips`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  // Try opening profile modal via sidebar user menu — find the user chip
  const modalOpened = await page.evaluate(() => {
    // Click the sidebar user area
    const userBtn = document.querySelector('.sidebar-user, .sidebar-footer .sidebar-user');
    if (userBtn) { userBtn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 800));
  if (modalOpened) {
    // Click "Thông tin cá nhân" if dropdown appears
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.sidebar-user-dropdown-item, button'));
      const profile = items.find(b => /Thông tin cá nhân|cá nhân/i.test(b.textContent || ''));
      if (profile) profile.click();
    });
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: 'qa/screenshots/qa-04-profile-modal.png' });
  }

  // Mobile viewport
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/trips`, { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'qa/screenshots/qa-05-trips-mobile.png', fullPage: false });

  console.log('\n=== CONSOLE ERRORS ===');
  console.log(errors.length ? errors.slice(0, 15).join('\n') : '(none)');
  console.log('\n=== FAILED REQUESTS ===');
  console.log(failedReqs.length ? [...new Set(failedReqs)].slice(0, 15).join('\n') : '(none)');

  await browser.close();
})().catch(e => { console.error('QA SCRIPT ERROR:', e.message); process.exit(1); });
