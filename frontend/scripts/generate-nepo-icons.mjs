#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'public/assets/icons/nepo');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const icons = [
  { name: 'dashboard', label: 'Dashboard', glyph: 'grid', accent: '#00B14F' },
  { name: 'dispatch', label: 'Dispatch', glyph: 'compass', accent: '#00B14F' },
  { name: 'trips', label: 'Trips', glyph: 'truck', accent: '#00B14F' },
  { name: 'fleet', label: 'Fleet', glyph: 'garage', accent: '#008B3E' },
  { name: 'customers', label: 'Customers', glyph: 'people', accent: '#1E5BB8' },
  { name: 'routes', label: 'Routes', glyph: 'route', accent: '#00B14F' },
  { name: 'salary', label: 'Salary', glyph: 'calendar', accent: '#00B14F' },
  { name: 'penalties', label: 'Penalties', glyph: 'warning', accent: '#E32434' },
  { name: 'finance', label: 'Finance', glyph: 'chart', accent: '#00B14F' },
  { name: 'debt', label: 'Receivables', glyph: 'receipt-in', accent: '#1E5BB8' },
  { name: 'payables', label: 'Payables', glyph: 'receipt-out', accent: '#F5A623' },
  { name: 'expenses', label: 'Expenses', glyph: 'wallet', accent: '#F5A623' },
  { name: 'advances', label: 'Advances', glyph: 'cash', accent: '#00B14F' },
  { name: 'settlements', label: 'Settlements', glyph: 'stamp', accent: '#008B3E' },
  { name: 'audit', label: 'Audit', glyph: 'log', accent: '#1E5BB8' },
  { name: 'config', label: 'Config', glyph: 'settings', accent: '#4D5852' },
];

function glyph(name, accent) {
  const common = `stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const soft = `fill="${accent}" fill-opacity=".12" stroke="${accent}" stroke-opacity=".34"`;
  switch (name) {
    case 'grid':
      return `<path ${common} d="M22 22h16v16H22zM50 22h16v16H50zM22 50h16v16H22zM50 50h16v16H50z"/>`;
    case 'compass':
      return `<circle ${common} cx="44" cy="44" r="23"/><path ${common} d="m53 31-6 18-18 6 6-18 18-6z"/><circle fill="${accent}" cx="41" cy="43" r="3"/>`;
    case 'truck':
      return `<path ${common} d="M16 49h35V29H16zM51 38h12l9 11v10H51zM24 61a6 6 0 1 0 0 .1M60 61a6 6 0 1 0 0 .1"/><path ${common} d="M22 36h21M22 43h14"/>`;
    case 'garage':
      return `<path ${common} d="M18 39 44 22l26 17v29H18z"/><path ${common} d="M28 68V48h32v20M34 55h20M34 62h20"/>`;
    case 'people':
      return `<circle ${common} cx="35" cy="34" r="9"/><circle ${common} cx="56" cy="38" r="7"/><path ${common} d="M20 66c3-12 11-19 24-19s21 7 24 19M50 55c8 1 13 5 16 11"/>`;
    case 'route':
      return `<path ${common} d="M22 62c18-29 30-35 45-20s-3 20-23 4S19 38 28 27c8-9 22-7 30 4"/><circle ${soft} cx="25" cy="63" r="6"/><circle ${soft} cx="58" cy="31" r="6"/>`;
    case 'calendar':
      return `<rect ${common} x="20" y="24" width="48" height="46" rx="8"/><path ${common} d="M30 18v12M58 18v12M20 38h48M32 50h8M48 50h8M32 60h8"/>`;
    case 'warning':
      return `<path ${common} d="m44 19 28 50H16L44 19z"/><path ${common} d="M44 35v16M44 60h.1"/>`;
    case 'chart':
      return `<path ${common} d="M20 66h50M26 58V43M42 58V29M58 58V37"/><path ${common} d="m25 38 15-12 13 8 15-17"/>`;
    case 'receipt-in':
      return `<path ${common} d="M25 18h38v52l-7-4-6 4-6-4-6 4-6-4-7 4z"/><path ${common} d="M34 34h20M34 45h20M34 56h12"/><path ${common} d="m61 48-8-8m0 0v7m0-7h7"/>`;
    case 'receipt-out':
      return `<path ${common} d="M25 18h38v52l-7-4-6 4-6-4-6 4-6-4-7 4z"/><path ${common} d="M34 34h20M34 45h20M34 56h12"/><path ${common} d="m53 40 8 8m0 0v-7m0 7h-7"/>`;
    case 'wallet':
      return `<path ${common} d="M20 31h43a8 8 0 0 1 8 8v24a7 7 0 0 1-7 7H22a8 8 0 0 1-8-8V30a8 8 0 0 1 8-8h36"/><path ${common} d="M55 47h18v15H55z"/><circle fill="${accent}" cx="62" cy="55" r="2.5"/>`;
    case 'cash':
      return `<rect ${common} x="18" y="28" width="52" height="34" rx="7"/><circle ${common} cx="44" cy="45" r="9"/><path ${common} d="M27 39v-3h7M61 51v3h-7"/>`;
    case 'stamp':
      return `<path ${common} d="M36 18h16v12c0 5 4 9 9 9v10H27V39c5 0 9-4 9-9V18zM23 49h42v16H23zM29 65v7h30v-7"/><path ${common} d="M32 57h24"/>`;
    case 'log':
      return `<path ${common} d="M24 19h31l13 13v38H24z"/><path ${common} d="M55 19v14h13M34 43h24M34 54h24M34 65h15"/>`;
    case 'settings':
      return `<path ${common} d="M44 25v-7M44 70v-7M25 44h-7M70 44h-7M30 30l-5-5M63 63l-5-5M58 30l5-5M25 63l5-5"/><circle ${common} cx="44" cy="44" r="14"/><circle fill="${accent}" fill-opacity=".18" cx="44" cy="44" r="6"/>`;
    default:
      return `<circle ${common} cx="44" cy="44" r="22"/>`;
  }
}

function svg({ label, glyph: glyphName, accent }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" fill="none" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="12" y1="8" x2="76" y2="80" gradientUnits="userSpaceOnUse">
      <stop stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#F1F8F4"/>
    </linearGradient>
    <filter id="shadow" x="0" y="0" width="88" height="88" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#005A2D" flood-opacity=".12"/>
    </filter>
  </defs>
  <rect x="10" y="10" width="68" height="68" rx="20" fill="url(#bg)" stroke="#D7DEDB" filter="url(#shadow)"/>
  <rect x="16" y="16" width="56" height="56" rx="16" fill="${accent}" fill-opacity=".055"/>
  <g transform="translate(0 0)" color="#101513">
    ${glyph(glyphName, accent)}
  </g>
</svg>
`;
}

async function renderPng(icon) {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 256, height: 256, deviceScaleFactor: 1 });
  const encoded = Buffer.from(svg(icon)).toString('base64');
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent;width:256px;height:256px}.wrap{width:256px;height:256px;display:grid;place-items:center}img{width:256px;height:256px}</style><div class="wrap"><img src="data:image/svg+xml;base64,${encoded}"></div>`);
  await page.screenshot({ path: join(OUT, `${icon.name}.png`), omitBackground: true });
  await browser.close();
}

await mkdir(OUT, { recursive: true });
for (const icon of icons) {
  await writeFile(join(OUT, `${icon.name}.svg`), svg(icon), 'utf8');
}

const manifest = {
  name: 'NEPO logistics icon set',
  version: 1,
  sizes: { svg: '88x88 viewBox', png: '256x256 transparent' },
  icons: icons.map(({ name, label, accent }) => ({
    name,
    label,
    svg: `/assets/icons/nepo/${name}.svg`,
    png: `/assets/icons/nepo/${name}.png`,
    accent,
  })),
};
await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

for (const icon of icons) {
  await renderPng(icon);
}

console.log(`Generated ${icons.length} SVG and PNG icons in ${OUT}`);
