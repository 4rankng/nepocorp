// NEPO-32 (id 625) — widget "Đơn hàng cần điều vận" no-truncate contract
// (doctrine docs/design-guidelines.md § No Truncation: wrap, never ellipsis).
//
// Owner report: Khách hàng "CÔNG TY CỐ PHẦN …", lái xe "Trần Văn …", tuyến
// "Zaitoon tea, Trạm Thần, Phú T…" bị ellipsis; pill biển số "15C-180.99" wrap
// 2 dòng trong ô hẹp. Pin này cấm tái diễn: cell wrap trọn, riêng pill 1 dòng.
import dispatchCss from './DispatchPage.css?raw';
import { describe, expect, it } from 'vitest';

// "ellipsis" chỉ được tính từ declarations — comment stripped trước khi quét.
const css = dispatchCss.replace(/\/\*[\s\S]*?\*\//g, '');

// Cells + grid chrome của widget: Khách hàng · Tuyến · Xe & lái xe.
const WIDGET = /\b(o-route|o-customer|assign-card|o-assign|orders-head|order-row)\b/;

// Quét 1 lần: body của mọi rule khớp WIDGET (kể cả rule trong @media).
// Tách theo '}' — file không có lồng nhau ngoài @media; '{' cuối trong mỗi
// chunk chính là '{' mở rule (media '{' đứng trước selector).
const widgetRules = css.split('}').flatMap((chunk) => {
  const at = chunk.lastIndexOf('{');
  if (at === -1) return [];
  const selector = chunk.slice(0, at);
  const body = chunk.slice(at + 1);
  return WIDGET.test(selector) ? [{ selector: selector.trim(), body }] : [];
});

const GRID_COLS = /grid-template-columns\s*:\s*([^;]+);/;

describe('dispatch orders widget no-truncate (NEPO-32)', () => {
  it('never ellipsizes any widget cell text', () => {
    // Guard: scan phải thật sự thấy widget rules — rỗng nghĩa là regex lệch.
    expect(widgetRules.length).toBeGreaterThan(5);
    for (const { selector, body } of widgetRules) {
      expect(body, `ellipsis trong rule: ${selector.slice(-60)}`)
        .not.toMatch(/text-overflow\s*:\s*ellipsis/);
    }
  });

  it('lets cell text wrap — nowrap chỉ dành cho pill biển số (1 dòng)', () => {
    for (const { selector, body } of widgetRules) {
      if (/\.ap\b/.test(selector)) {
        expect(body, selector).toMatch(/white-space\s*:\s*nowrap/);
      } else {
        expect(body, selector).not.toMatch(/white-space\s*:\s*nowrap/);
      }
    }
  });

  it('keeps header and row grids in sync (đầu bảng không lệch thân bảng)', () => {
    const headCols = widgetRules.find((r) => r.selector === '.dispatch-page .orders-head')
      ?.body.match(GRID_COLS)?.[1].trim();
    const rowCols = widgetRules.find((r) => r.selector === '.dispatch-page .order-row')
      ?.body.match(GRID_COLS)?.[1].trim();
    expect(headCols).toBeTruthy();
    expect(rowCols).toBe(headCols);
  });
});
