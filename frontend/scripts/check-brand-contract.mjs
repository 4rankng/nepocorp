import { access, readFile } from 'node:fs/promises';

const failures = [];
const scopedRuntimeFiles = [
  '../src/components/Layout.tsx',
  '../src/components/AssetIcon.tsx',
  '../src/components/agent/AgentAssistant.tsx',
  '../src/components/layout/Sidebar.tsx',
  '../src/components/onboarding/OnboardingChecklist.tsx',
  '../src/pages/LoginPage.tsx',
  '../src/lib/csv.ts',
  '../src/lib/routes.ts',
  '../index.html',
  '../public/manifest.json',
  '../public/sw.js',
];

for (const relativePath of scopedRuntimeFiles) {
  const source = await readFile(new URL(relativePath, import.meta.url), 'utf8');
  if (/\bTingTing\b|NEPO Logistics/.test(source)) {
    failures.push(`${relativePath}: legacy user-facing product label`);
  }
}

const brandSource = await readFile(new URL('../src/brand.ts', import.meta.url), 'utf8');
const tokenSource = await readFile(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const buttonSource = await readFile(new URL('../src/components/Button.css', import.meta.url), 'utf8');
const dashboardSource = await readFile(new URL('../src/pages/DashboardPage.css', import.meta.url), 'utf8');
const agentSource = await readFile(new URL('../src/components/agent/agent.css', import.meta.url), 'utf8');
const tableSource = await readFile(new URL('../src/components/Table.css', import.meta.url), 'utf8');
const onboardingStyleSource = await readFile(
  new URL('../src/components/onboarding/onboarding-checklist.css', import.meta.url),
  'utf8',
);
for (const requiredCopy of [
  "name: 'TransTing'",
  "tagline: 'Vận tải thông minh. Doanh nghiệp vững mạnh.'",
  "shellDescriptor: 'Quản lý vận tải và logistics'",
  "sidebarLogoPath: '/assets/transting-sidebar-mark-192.png'",
]) {
  if (!brandSource.includes(requiredCopy)) {
    failures.push(`src/brand.ts: missing ${requiredCopy}`);
  }
}

for (const requiredToken of [
  '--color-primary: #005A2D',
  '--accent-2: #005A2D',
  '--accent-ink: #00361B',
  '--brand: #005A2D',
  '--brand-hover: #00361B',
  '--sb-bg: #005A2D',
  '--sb-gradient-start: #005A2D',
  '--sb-gradient-end: #00361B',
  '--sidebar: #005A2D',
]) {
  if (!tokenSource.includes(requiredToken)) {
    failures.push(`src/styles/tokens.css: missing ${requiredToken}`);
  }
}

for (const [sourceName, source, requiredRule] of [
  [
    'src/components/Button.css',
    buttonSource,
    /\.d-btn-primary:hover:not\(:disabled\)\s*\{[^}]*background-color:\s*var\(--brand-hover\)/,
  ],
  [
    'src/pages/DashboardPage.css',
    dashboardSource,
    /\.dash-wf \.wf-btn--primary:hover\s*\{[^}]*background:\s*var\(--brand-hover\)/,
  ],
  [
    'src/pages/DashboardPage.css',
    dashboardSource,
    /\.dash-wf \.wf-minibtn\.green:hover\s*\{[^}]*background:\s*var\(--brand-hover\)/,
  ],
  [
    'src/components/agent/agent.css',
    agentSource,
    /\.agent-tour__btn--primary:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--brand-hover/,
  ],
  [
    'src/components/Table.css',
    tableSource,
    /\.ancillary-fee-card__btn--approve:hover\s*\{[^}]*background:\s*var\(--brand\)/,
  ],
  [
    'src/components/onboarding/onboarding-checklist.css',
    onboardingStyleSource,
    /\.ob-checklist__tour-btn\s*\{[^}]*color:\s*var\(--brand\)[^}]*background:\s*var\(--brand-soft\)/,
  ],
]) {
  if (!requiredRule.test(source)) {
    failures.push(`${sourceName}: missing emerald CTA rule ${requiredRule}`);
  }
}

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const manifest = await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

if (!index.includes('TransTing') || !index.includes('<title>TransTing</title>')) {
  failures.push('index.html: missing TransTing browser title');
}
if (!manifest.includes('"short_name": "TransTing"')) {
  failures.push('public/manifest.json: missing TransTing short name');
}
if (!serviceWorker.includes("data.title || 'TransTing'")
  || !serviceWorker.includes('/assets/transting-logo-192.png')) {
  failures.push('public/sw.js: notification identity is not TransTing');
}

for (const size of [180, 192, 512]) {
  try {
    await access(new URL(`../public/assets/transting-logo-${size}.png`, import.meta.url));
  } catch {
    failures.push(`public/assets/transting-logo-${size}.png: missing PWA asset`);
  }
}

try {
  await access(new URL('../public/assets/transting-sidebar-mark-192.png', import.meta.url));
} catch {
  failures.push('public/assets/transting-sidebar-mark-192.png: missing sidebar mark');
}

if (failures.length > 0) {
  console.error('TransTing brand contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('TransTing brand contract passed.');
}
