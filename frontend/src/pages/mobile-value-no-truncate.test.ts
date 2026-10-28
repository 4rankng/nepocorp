// NEPO-39 (id 662) — no-truncate contract cho giá trị then chốt trên mobile
// (doctrine shipmate-uiux: data-dense + no-truncate). Tiền không bao giờ bị
// ellipsis; tên/mã wrap ≤2 dòng kèm title; meta row xuống dòng thay vì cắt.
// Pin này cấm tái diễn "20.000.000 ₫" / "CÔNG TY TNHH …" / tên lái xe bị "…".
import dashboardCss from './DashboardPage.css?raw';
import expenseCss from './ExpenseListPage.css?raw';
import calendarCss from './salary-attendance/calendar.css?raw';
import { describe, expect, it } from 'vitest';

// Tách rule body theo '}' — file CSS không lồng ngoài @media; '{' cuối trong
// mỗi chunk là '{' mở rule (media '{' đứng trước selector).
function rules(css: string): Array<{ selector: string; body: string }> {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').flatMap((chunk) => {
    const at = chunk.lastIndexOf('{');
    if (at === -1) return [];
    return [{ selector: chunk.slice(0, at).trim(), body: chunk.slice(at + 1) }];
  });
}

const mediaScope = (selector: string) => selector.includes('(max-width: 1023px)');

describe('mobile key values never truncate (NEPO-39)', () => {
  it('dashboard todo title/meta wrap ≤1023px instead of ellipsizing money', () => {
    const scoped = rules(dashboardCss).filter((r) => mediaScope(r.selector) || r.selector.includes('wf-todo__t'));
    const wrapRule = scoped.find((r) => r.selector.includes('.wf-todo__t') && r.body.includes('white-space: normal'));
    expect(wrapRule, 'wf-todo__t wrap rule ≤1023px missing').toBeTruthy();
    expect(wrapRule!.body).not.toContain('text-overflow: ellipsis');
    const metaRule = scoped.find((r) => r.selector.includes('.wf-todo__m') && r.body.includes('white-space: normal'));
    expect(metaRule, 'wf-todo__m wrap rule ≤1023px missing').toBeTruthy();
    expect(metaRule!.body).not.toContain('text-overflow: ellipsis');
  });

  it('expense mobile card supplier wraps ≤2 lines and sub never ellipsizes', () => {
    const all = rules(expenseCss);
    const supplier = all.find((r) => r.selector.includes('.expense-mcard__supplier') && r.body.includes('line-clamp'));
    expect(supplier, 'supplier 2-line clamp missing').toBeTruthy();
    expect(supplier!.body).toMatch(/-webkit-line-clamp:\s*2/);
    expect(supplier!.body).not.toContain('white-space: nowrap');
    const sub = all.find((r) => r.selector.includes('.expense-mcard__sub') && r.body.includes('white-space: normal'));
    expect(sub, 'sub wrap rule missing').toBeTruthy();
    expect(sub!.body).not.toContain('text-overflow: ellipsis');
  });

  it('driver name wraps ≤2 lines ≤1023px (chip @768 + card @390)', () => {
    const scoped = rules(calendarCss).filter((r) => mediaScope(r.selector));
    const nameRule = scoped.find((r) => r.selector.includes('.driver-select-card__name'));
    expect(nameRule, 'driver-select-card__name wrap rule ≤1023px missing').toBeTruthy();
    expect(nameRule!.body).toMatch(/-webkit-line-clamp:\s*2/);
    expect(nameRule!.body).not.toContain('white-space: nowrap');
  });
});
