import { readdir, readFile } from 'node:fs/promises';
import { extname, relative } from 'node:path';
import ts from 'typescript';

const sourceRoot = new URL('../src/', import.meta.url);
const failures = [];
const sharedColorFiles = [
  'components/Button.css',
  'components/Input.css',
  'components/Panel.css',
  'components/KpiCard.css',
  'components/Table.css',
  'components/Toolbar.css',
  'components/FilterBar.css',
  'components/FwdFilterPills.css',
  'components/Pill.css',
  'components/PageHeader.css',
];

async function visit(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const entryUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) {
      await visit(new URL(`${entry.name}/`, directoryUrl));
      return;
    }
    if (extname(entry.name) !== '.css') return;

    const css = await readFile(entryUrl, 'utf8');
    const displayPath = relative(new URL('..', sourceRoot).pathname, entryUrl.pathname);

    if (/border-left\s*:\s*[23456]px\s+solid/i.test(css)) {
      failures.push(`${displayPath}: full-height colored left border`);
    }
    if (/width\s*:\s*4px\s*;\s*height\s*:\s*32px/i.test(css)
      || /width\s*:\s*4px\s*;[\s\S]{0,48}height\s*:\s*32px/i.test(css)) {
      failures.push(`${displayPath}: legacy 4x32 status rail`);
    }
  }));
}

await visit(sourceRoot);

const tokenCss = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
// Resolve aliases so the contract checks the effective typography, including
// future changes to the underlying scale rather than only token spelling.
const typeTokens = new Map([...tokenCss.matchAll(/(--fs-[\w-]+):\s*([^;]+);/g)]
  .map((match) => [match[1], match[2].trim()]));
function typeSize(token, seen = new Set()) {
  if (seen.has(token)) return NaN;
  seen.add(token);
  const value = typeTokens.get(token) ?? '';
  const alias = value.match(/^var\((--fs-[\w-]+)\)$/);
  return alias ? typeSize(alias[1], seen) : Number(value.replace(/px$/, ''));
}
for (const [role, expected] of Object.entries({
  body: 12, control: 12, table: 12, label: 11, caption: 11,
  section: 14, dialog: 16, 'page-title': 18,
})) {
  if (typeSize(`--fs-${role}`) !== expected) {
    failures.push(`styles/tokens.css: ${role} typography must resolve to ${expected}px`);
  }
}
if (!tokenCss.includes('--status-strip-width: 3px;')
  || !tokenCss.includes('--status-strip-height: 20px;')) {
  failures.push('styles/tokens.css: canonical status strip must remain 3x20px');
}
if (!tokenCss.includes('--fs-status-pill: 11px;')) {
  failures.push('styles/tokens.css: compact status pill text must remain 11px');
}
if (!tokenCss.includes('--sb-gradient-start:')
  || !tokenCss.includes('--sb-gradient-end:')) {
  failures.push('styles/tokens.css: sidebar gradient must remain tokenized');
}

const sidebarCss = await readFile(
  new URL('../src/components/layout/sidebar.css', import.meta.url),
  'utf8',
);
if (!/linear-gradient\(\s*180deg,\s*var\(--sb-gradient-start\)[\s\S]*var\(--sb-gradient-end\)/i
  .test(sidebarCss)) {
  failures.push('components/layout/sidebar.css: shared sidebar must use semantic gradient tokens');
}

const baseCss = await readFile(new URL('../src/styles/base.css', import.meta.url), 'utf8');
if (!/:focus-visible\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--accent-2\)/i.test(baseCss)) {
  failures.push('styles/base.css: global focus indicator must use the high-contrast accent token');
}

const inputCss = await readFile(new URL('../src/components/Input.css', import.meta.url), 'utf8');
const buttonCss = await readFile(new URL('../src/components/Button.css', import.meta.url), 'utf8');
const smallButtonRules = [...buttonCss.matchAll(/(?<![\w.-])\.btn--sm\s*\{([^}]+)\}/g)];
if (smallButtonRules.length < 2 || smallButtonRules.some((match) =>
  !/font-size:\s*var\(--fs-control\)/.test(match[1]))) {
  failures.push('components/Button.css: small buttons must retain control-sized text on desktop and phone');
}
const dataTableCss = await readFile(new URL('../src/design-system/DataTable.css', import.meta.url), 'utf8');
if (!/\.ds-table\s*\{[^}]*font-size:\s*var\(--fs-table\)/.test(dataTableCss)
  || !/\.ds-table thead th\s*\{[^}]*font-size:\s*var\(--fs-label\)/.test(dataTableCss)) {
  failures.push('design-system/DataTable.css: distinguish data text from column labels');
}
if (!/\.input:focus-visible(?:\s*,\s*\.[\w-]+:focus-visible)*\s*\{[^}]*outline:\s*2px\s+solid\s+var\(--accent-2\)/i
  .test(inputCss)) {
  failures.push('components/Input.css: inputs must retain the high-contrast focus outline');
}

const pillCss = await readFile(new URL('../src/components/Pill.css', import.meta.url), 'utf8');
if (!/\.pill\s*\{[^}]*font-size:\s*var\(--fs-status-pill\)/i.test(pillCss)) {
  failures.push('components/Pill.css: default status pills must use the compact typography token');
}
if (!/\.pill--md\s*\{[^}]*font-size:\s*var\(--fs-body\)/i.test(pillCss)) {
  failures.push('components/Pill.css: medium status pills must remain larger than the compact default');
}

const responsiveCss = await readFile(
  new URL('../src/styles/responsive.css', import.meta.url),
  'utf8',
);
const phoneBlockStart = responsiveCss.indexOf('@media (max-width: 640px)');
const phoneCss = phoneBlockStart >= 0 ? responsiveCss.slice(phoneBlockStart) : '';
const phoneControlSelectors = [
  '#root button',
  '#root [role="button"]',
  '#root a[href]',
  '#root input:not([type="checkbox"]):not([type="radio"])',
  '#root select',
];
const universalPhoneRule = phoneCss.match(
  /#root button,[\s\S]*?#root select\s*\{[^}]*min-height:\s*var\(--control-h\)\s*;/i,
)?.[0] ?? '';
for (const selector of phoneControlSelectors) {
  if (!universalPhoneRule.includes(selector)) {
    failures.push(`styles/responsive.css: missing universal phone selector ${selector}`);
  }
}
// Two-tier phone scale (kanban 20260924_1, MooMoo/Shopee/Grab density):
// dense 36px floor through --control-h; 44px reserved for --cta-h commit
// surfaces and the driver-portal floor.
for (const [needle, minCount, where] of [
  ['--control-h: 36px', 2, 'both the phone-width and coarse-pointer overrides'],
  ['--cta-h: 44px', 2, 'both the phone-width and coarse-pointer overrides'],
]) {
  const count = tokenCss.split(needle).length - 1;
  if (count < minCount) {
    failures.push(`styles/tokens.css: expected ${needle} in ${where} (phone control scale)`);
  }
}
if (!/--cta-h:\s*var\(--control-h\)/.test(tokenCss)) {
  failures.push('styles/tokens.css: desktop --cta-h must follow the control scale');
}
for (const ctaCssPath of [
  'components/trip/ActionBar.css',
  'components/Modal.css',
  'design-system/forms/CrudFormModal.css',
]) {
  const ctaSource = await readFile(new URL(`../src/${ctaCssPath}`, import.meta.url), 'utf8');
  if (!ctaSource.includes('var(--cta-h)')) {
    failures.push(`${ctaCssPath}: commit surfaces must size from --cta-h`);
  }
}
if (!/#root \.is-driver button[\s\S]*?min-height:\s*44px/.test(phoneCss)) {
  failures.push('styles/responsive.css: driver portal must keep the 44px touch floor');
}
for (const selector of ['.wf-link', '.wf-btn', '.stab-pill']) {
  const escapedSelector = selector.replace('.', '\\.');
  const rule = new RegExp(`${escapedSelector}\\s*\\{[^}]*min-height:\\s*44px`, 'i');
  if (!rule.test(phoneCss)) {
    failures.push(`styles/responsive.css: ${selector} must remain at least 44px on phones`);
  }
}

// Customer routes use the shared, unframed filter row at every viewport.
for (const page of ['pages/CustomersPage.tsx', 'pages/config/CustomersConfigPage.tsx']) {
  const source = await readFile(new URL(`../src/${page}`, import.meta.url), 'utf8');
  if (!source.includes('<ListFilterBar')) failures.push(`${page}: use the shared ListFilterBar`);
}
const listFilterCss = await readFile(new URL('../src/components/shared/ListFilterBar.css', import.meta.url), 'utf8');
const listFilterRule = listFilterCss.match(/\.list-filter-bar\s*\{[^}]*\}/)?.[0] ?? '';
if (!/background:\s*transparent/.test(listFilterRule) || !/border:\s*0\b/.test(listFilterRule)) {
  failures.push('components/shared/ListFilterBar.css: list filters must share their surrounding surface');
}

const driverPenaltyCss = await readFile(
  new URL('../src/pages/DriverPenaltyPage.css', import.meta.url),
  'utf8',
);
if (!/select\.penalty-month-select\s*\{[^}]*min-height:\s*44px/i
  .test(driverPenaltyCss)) {
  failures.push('pages/DriverPenaltyPage.css: mobile month select must remain at least 44px');
}

const advanceSettlementLedgerSource = await readFile(
  new URL('../src/pages/AdminAdvanceSettlementsPage.tsx', import.meta.url),
  'utf8',
);
const forbiddenAdvanceSettlementLedgerDetails = [
  'useAdminSettlementOpsCompletion',
  'OpsCompletionSummary',
  'opsCompletion',
];
for (const forbiddenDetail of forbiddenAdvanceSettlementLedgerDetails) {
  if (advanceSettlementLedgerSource.includes(forbiddenDetail)) {
    failures.push(
      `pages/AdminAdvanceSettlementsPage.tsx: ledger must not render inline Ops detail (${forbiddenDetail})`,
    );
  }
}

for (const file of sharedColorFiles) {
  const css = await readFile(new URL(`../src/${file}`, import.meta.url), 'utf8');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) {
    failures.push(`${file}: shared primitive colors must use semantic tokens`);
  }
}

async function checkInlineTouchTargets(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) {
      await checkInlineTouchTargets(new URL(`${entry.name}/`, directoryUrl));
      continue;
    }
    if (extname(entry.name) !== '.tsx') continue;

    const source = await readFile(entryUrl, 'utf8');
    const displayPath = relative(new URL('..', sourceRoot).pathname, entryUrl.pathname);
    const sourceFile = ts.createSourceFile(
      displayPath,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function inspect(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sourceFile);
        const isInteractive = ['button', 'a', 'Link', 'NavLink', 'input', 'select']
          .includes(tag);
        if (isInteractive) {
          const styleAttribute = node.attributes.properties.find(
            (attribute) => ts.isJsxAttribute(attribute)
              && attribute.name.getText(sourceFile) === 'style',
          );
          const expression = styleAttribute
            && ts.isJsxAttribute(styleAttribute)
            && styleAttribute.initializer
            && ts.isJsxExpression(styleAttribute.initializer)
            ? styleAttribute.initializer.expression
            : undefined;
          if (expression && ts.isObjectLiteralExpression(expression)) {
            const minHeightProperty = expression.properties.find(
              (property) => ts.isPropertyAssignment(property)
                && property.name.getText(sourceFile) === 'minHeight',
            );
            if (minHeightProperty && ts.isPropertyAssignment(minHeightProperty)) {
              const valueText = minHeightProperty.initializer.getText(sourceFile)
                .replaceAll(/['"]/g, '')
                .replace('px', '');
              const value = Number(valueText);
              if (Number.isFinite(value) && value < 36) {
                const line = sourceFile.getLineAndCharacterOfPosition(
                  minHeightProperty.getStart(sourceFile),
                ).line + 1;
                failures.push(`${displayPath}:${line}: inline interactive minHeight must be at least 36px`);
              }
            }
          }
        }
      }
      ts.forEachChild(node, inspect);
    }

    inspect(sourceFile);
  }
}

await checkInlineTouchTargets(sourceRoot);

if (failures.length > 0) {
  console.error('UI contract check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('UI contract check passed.');
