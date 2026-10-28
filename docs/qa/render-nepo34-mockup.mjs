// NEPO-34 — render the DESIGN LOCK mockup to PNG evidence stills (docs/qa
// convention: nepo32-dispatch-widget-1280-after.png etc.). Run from repo root:
//   node docs/qa/render-nepo34-mockup.mjs
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const target = 'file://' + join(here, 'nepo34-ocr-log-mockup.html');

const browser = await puppeteer.launch();
const page = await browser.newPage();

await page.setViewport({ width: 1280, height: 900 });
await page.goto(target, { waitUntil: 'networkidle0' });
await page.screenshot({ path: join(here, 'nepo34-ocr-log-desktop.png'), fullPage: true });

await page.setViewport({ width: 390, height: 844 });
await page.reload({ waitUntil: 'networkidle0' });
await page.screenshot({ path: join(here, 'nepo34-ocr-log-mobile.png'), fullPage: true });

await browser.close();
console.log('mockup stills written');
