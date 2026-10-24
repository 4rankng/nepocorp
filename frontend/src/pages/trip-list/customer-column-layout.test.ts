// NEPO-12 — Khách hàng cell layout contract (owner 24/10: tên trên 1-2 dòng,
// pill "Xe ngoài" xuống dòng riêng BÊN DƯỚI — không cùng hàng).
//
// Hai cái bẫy đã bite thật:
// 1. `.trip-col` base để `flex-direction: column` — nếu span tên mang
//    `flex: 1 1 0` thì basis 0 nằm trên trục DỌC → height về 0 → tên vô hình
//    trong khi pill vẫn hiện (bug demo 24/10, probe: height 0 → 30.8px).
//    Vì vậy layout này PHẢI là column và tên PHẢI basis auto.
// 2. `flex-direction: row` (bản fix đầu) đổ tên và pill cùng hàng — owner
//    bác. Không được quay lại row.
import tableCss from './table.css?raw';
import { describe, expect, it } from 'vitest';

/** Body of the first CSS rule whose selector appears immediately before `{`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

describe('trip-list customer column layout (NEPO-12)', () => {
  it('stacks the cell: flex-direction column with vertical centering', () => {
    const cell = rule(tableCss, '.trip-list-page .trip-col--customer');
    expect(cell).toMatch(/flex-direction\s*:\s*column/);
    expect(cell).toMatch(/justify-content\s*:\s*center/);
    expect(cell).not.toMatch(/flex-direction\s*:\s*row/);
  });

  it('keeps the name span basis-auto on the vertical main axis (no flex: 1 1 0 collapse)', () => {
    // The 2-line-clamp block is the SECOND .trip-customer-name rule — identify
    // it by its -webkit-line-clamp declaration.
    const clampRule = tableCss.match(
      /\.trip-list-page \.trip-col--customer \.trip-customer-name\s*\{[^}]*-webkit-line-clamp[^}]*\}/,
    )?.[0] ?? '';
    expect(clampRule).not.toMatch(/flex\s*:\s*[^;]*\b0\b[^;]*[,)]/);
    expect(clampRule).toMatch(/align-self\s*:\s*stretch/);
  });
});
