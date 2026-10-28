// NEPO-42 (id 665) — row KH tablet density contract (shipmate-uiux:
// data-dense). Row ≤~72px @640–1023px: gộp MST + Công nợ 1 dòng, "Sửa" inline
// cuối dòng với hit ≥44px bằng ::before (allowance NEPO-36). @≤639px giữ
// nguyên (AC: @390 đã ổn); desktop ≥1024 dùng bảng.
import utilitiesCss from '../styles/utilities.css?raw';
import { describe, expect, it } from 'vitest';

// Lấy body của media block theo query (comment đã strip) rồi tách rule bên trong
// — parser theo chunk '}' đơn thuần sẽ mất text media ở rule thứ N.
function bandRules(css: string, query: string): Array<{ selector: string; body: string }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = clean.indexOf(`@media ${query}`);
  if (at === -1) return [];
  const open = clean.indexOf('{', at);
  let depth = 1;
  let j = open + 1;
  while (j < clean.length && depth > 0) {
    if (clean[j] === '{') depth += 1;
    if (clean[j] === '}') depth -= 1;
    j += 1;
  }
  return clean.slice(open + 1, j - 1).split('}').flatMap((chunk) => {
    const k = chunk.lastIndexOf('{');
    if (k === -1) return [];
    return [{ selector: chunk.slice(0, k).trim(), body: chunk.slice(k + 1) }];
  });
}

const BAND = '(min-width: 640px) and (max-width: 1023px)';
const band = bandRules(utilitiesCss, BAND);

describe('/customers tablet row density (NEPO-42)', () => {
  it('compacts the customer card into merged meta lines in the 640–1023 band', () => {
    expect(band.length).toBeGreaterThan(0);
    const card = band.find((r) => r.selector.trim().endsWith('.m-card'));
    expect(card, 'customer card flex rule in band missing').toBeTruthy();
    expect(card!.body).toMatch(/display:\s*flex/);
    expect(card!.body).toMatch(/flex-direction:\s*row/);
    expect(card!.body).toMatch(/flex-wrap:\s*wrap/);
    // padding dọc ≤12px theo AC.
    const pad = card!.body.match(/padding:\s*(\d+)px/);
    expect(pad).toBeTruthy();
    expect(Number(pad![1])).toBeLessThanOrEqual(12);
  });

  it('puts Sửa inline at the end of the data line (no dedicated edit row)', () => {
    const editRow = band.find((r) => r.selector.includes('.m-card-edit-row') && !r.selector.includes('.btn'));
    expect(editRow, 'inline edit-row rule missing').toBeTruthy();
    expect(editRow!.body).toMatch(/margin:\s*0/);
    expect(editRow!.body).not.toContain('position: absolute');
  });

  it('keeps the Sửa hit area ≥44px via ::before while the visual stays compact', () => {
    const btn = band.find((r) => r.selector.includes('.m-card-edit-row .btn::before'));
    expect(btn, 'Sửa ::before hit overlay missing').toBeTruthy();
    expect(btn!.body).toMatch(/width:\s*44px/);
    expect(btn!.body).toMatch(/height:\s*44px/);
  });
});
