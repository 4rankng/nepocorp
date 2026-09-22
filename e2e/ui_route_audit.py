#!/usr/bin/env python3
"""Read-only local UI audit across all App routes, roles and responsive widths.

Requires a seeded local app and Python Playwright. Example:
  python3 e2e/ui_route_audit.py --fixtures /tmp/nepo-qa/fixture.json
Only login requests are sent; this script never submits application mutations.
Artifacts and the explicit coverage matrix are written outside the repository.
"""
import argparse
import asyncio
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

ACCOUNTS = {'ADMIN': 'admin', 'MANAGER': 'giamdoc', 'ACCOUNTANT': 'ketoan', 'DRIVER': 'laixe', 'FORWARDER': 'giaonhan'}
HOMES = {'DRIVER': '/my-trips', 'FORWARDER': '/my-forwarder-trips'}
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

def routes(role, fixtures):
    source = (Path(__file__).resolve().parents[1] / 'frontend/src/App.tsx').read_text()
    paths = re.findall(r'<Route\s+path="([^"]+)"\s+element=\{([^\n]+)', source)
    result = [('/dashboard', '/dashboard')] if role not in HOMES else []
    for path, element in paths:
        if 'page(' not in element or path in ('*', '/') or (path == '/dashboard' and role in HOMES):
            continue
        if 'strictAdminOnly' in element and role != 'ADMIN': continue
        if 'managerOrAdminOnly' in element and role not in ('ADMIN', 'MANAGER'): continue
        if 'driverOnly' in element and role != 'DRIVER': continue
        if 'forwarderOnly' in element and role != 'FORWARDER': continue
        if ('adminOnly' in element or 'officeStaffOnly' in element) and role in HOMES: continue
        key = 'trip'
        if '/fleet' in path or '/trucks' in path: key = 'truck'
        if '/trailers' in path: key = 'trailer'
        if '/debt' in path or '/customers' in path: key = 'customer'
        if '/payables' in path or '/suppliers' in path: key = 'supplier'
        if '/expenses/' in path: key = 'expense'
        if '/debit-note-templates/' in path: key = 'template'
        if 'settlements/' in path: key = 'settlement'
        value = fixtures.get(role, {}).get(key, fixtures.get(key, 1))
        actual = re.sub(r':\w+', str(value), path)
        result.append((path, actual))
    return list(dict.fromkeys(result))

async def audit_role(browser, role, width, args, fixtures, semaphore):
    async with semaphore:
        context = await browser.new_context(viewport={'width': width, 'height': args.height or (900 if width > 600 else 844)}, reduced_motion=args.motion, service_workers='block')
        response = await context.request.post(args.url + '/api/auth/login', data={'identifier': ACCOUNTS[role], 'password': args.password})
        if response.status != 200: raise RuntimeError(f'{role}: login returned {response.status}')
        token = (await response.json())['token']
        await context.add_init_script('localStorage.setItem("token", ' + json.dumps(token) + ');')
        page = await context.new_page()
        rows, errors, api_errors = [], [], []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('response', lambda res: api_errors.append({'url': res.url, 'status': res.status}) if '/api/' in res.url and (res.status >= 400 or '/api/onboarding' in res.url) else None)
        for pattern, path in routes(role, fixtures):
            errors.clear(); api_errors.clear()
            row = {'role': role, 'width': width, 'pattern': pattern, 'path': path}
            try:
                await page.goto(args.url + path, wait_until='networkidle', timeout=45000)
                await page.wait_for_function("document.body.innerText.trim().length > 40")
                await page.evaluate('document.fonts.ready')
                await page.wait_for_timeout(150)
                row['url'] = urlparse(page.url).path
                row['layout'] = await page.evaluate('''() => ({
                  width: innerWidth, documentWidth: document.documentElement.scrollWidth,
                  headings: [...document.querySelectorAll('h1,h2')].map(x => x.textContent.trim()).filter(Boolean),
                  textLength: document.body.innerText.trim().length,
                  errorBoundary: document.body.innerText.includes('Đã xảy ra lỗi'),
                  authenticatedShell: !!document.querySelector('.app-body'),
                  onboardingVisible: !!document.querySelector('.ob-checklist, .tutorial-library'),
                  controls: document.querySelectorAll('button,input,select,textarea,a').length
                })''')
                row['errors'] = list(errors); row['apiErrors'] = list(api_errors)
                row['controlTypography'] = await page.evaluate('''() => [...document.querySelectorAll('.input, .ds-field__input, .ui-select-trigger, .searchable-select__trigger')]
                  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; })
                  .map(e => ({ classes: e.className, fontSize: getComputedStyle(e).fontSize, fontFamily: getComputedStyle(e).fontFamily }))''')
                row['passed'] = (row['url'] == path and row['layout']['authenticatedShell'] and not errors and not api_errors and not row['layout']['errorBoundary'] and not row['layout']['onboardingVisible'] and row['layout']['textLength'] > 40 and row['layout']['documentWidth'] <= width + 1)
                if args.capture_all_roles or role == 'ADMIN' or role in HOMES or not row['passed']:
                    filename = f'{role.lower()}-{width}-{path.strip("/").replace("/", "_")}.png'
                    await page.screenshot(path=str(args.output / filename), full_page=True, timeout=15000)
                    row['screenshot'] = filename
                    # The app scrolls inside its shell; a full-page screenshot
                    # alone misses content below that inner viewport.
                    scroller = page.locator('.app-body').first
                    if args.capture_sections and await scroller.count():
                        maximum = await scroller.evaluate('(e) => e.scrollHeight - e.clientHeight')
                        if maximum > 80:
                            row['sections'] = []
                            for section, offset in [('middle', round(maximum / 2)), ('bottom', maximum)]:
                                await scroller.evaluate('(e, top) => { e.style.scrollBehavior = "auto"; e.scrollTop = top; }', offset)
                                await page.wait_for_timeout(100)
                                section_file = filename[:-4] + '-' + section + '.png'
                                await page.screenshot(path=str(args.output / section_file), timeout=15000)
                                row['sections'].append(section_file)
            except Exception as err:
                row.update(passed=False, failure=str(err), errors=list(errors), apiErrors=list(api_errors))
            rows.append(row)
            print(json.dumps({k: row.get(k) for k in ('role','width','path','passed','failure','apiErrors')}, ensure_ascii=False), flush=True)
            (args.output / f'{role.lower()}-{width}.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
        # Forbidden UI routes must return the role's normal home.
        denied = ['/users', '/config/app-settings'] if role in HOMES else ([] if role == 'ADMIN' else ['/config/app-settings'])
        for path in denied:
            expected = HOMES.get(role, '/dashboard')
            row = {'role': role, 'width': width, 'path': path, 'guard': True}
            try:
                await page.goto(args.url + path, wait_until='networkidle')
                # React's Navigate effect can follow the final network response.
                await page.wait_for_url(args.url + expected, timeout=15000)
                row.update(passed=True, url=urlparse(page.url).path)
            except Exception as err:
                row.update(passed=False, url=urlparse(page.url).path, failure=str(err))
            rows.append(row)
        await context.close()
        return rows

async def main(args):
    if urlparse(args.url).hostname not in ('localhost', '127.0.0.1', '::1'):
        raise SystemExit('This audit is restricted to localhost.')
    args.output.mkdir(parents=True, exist_ok=True)
    fixtures = json.loads(args.fixtures.read_text()) if args.fixtures else {}
    async with async_playwright() as p:
        options = {'headless': True}
        if args.chrome: options['executable_path'] = args.chrome
        browser = await p.chromium.launch(**options)
        sem = asyncio.Semaphore(args.concurrency)
        groups = await asyncio.gather(*(audit_role(browser, role, width, args, fixtures, sem) for role in args.roles for width in args.widths))
        rows = [row for group in groups for row in group]
        report = {'checks': len(rows), 'passed': sum(row['passed'] for row in rows), 'failed': sum(not row['passed'] for row in rows), 'results': rows}
        (args.output / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
        await browser.close()
        print(json.dumps({k: report[k] for k in ('checks','passed','failed')}))
        return int(report['failed'] > 0)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://localhost:7173')
    parser.add_argument('--password', default='admin123', help='Local seeded test-account password')
    parser.add_argument('--fixtures', type=Path)
    parser.add_argument('--output', type=Path, default=Path('/tmp/nepo-ui-audit'))
    parser.add_argument('--chrome', default=CHROME if Path(CHROME).exists() else None)
    parser.add_argument('--roles', nargs='+', choices=list(ACCOUNTS), default=list(ACCOUNTS))
    parser.add_argument('--widths', nargs='+', type=int, default=[1440, 390])
    parser.add_argument('--height', type=int, help='Override viewport height for short phone/landscape checks')
    parser.add_argument('--capture-sections', action='store_true', help='Also capture the middle and bottom of the app scroll area')
    parser.add_argument('--capture-all-roles', action='store_true', help='Capture successful office-role routes as well as admin and portal routes')
    parser.add_argument('--motion', choices=['reduce', 'no-preference'], default='reduce')
    parser.add_argument('--concurrency', type=int, choices=[1, 2], default=1, help='Keep browser memory bounded during broad local audits')
    raise SystemExit(asyncio.run(main(parser.parse_args())))
