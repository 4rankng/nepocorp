// NEPO-41 (id 664) — /dispatch fleet card density + hero CTA contract
// (shipmate-uiux: data-dense + no-overlap). Card đội xe compact ≤1023px:
// field rỗng ẩn, card ≤~72px khi thiếu dữ liệu; nút Tạo chuyến wrap trong
// padding hero thay vì tràn mép viewport.
import dispatchCss from './DispatchPage.css?raw';
import { describe, expect, it } from 'vitest';

// Tách rule body theo '}' — file CSS không lồng ngoài @media.
function rules(css: string): Array<{ selector: string; body: string }> {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').flatMap((chunk) => {
    const at = chunk.lastIndexOf('{');
    if (at === -1) return [];
    return [{ selector: chunk.slice(0, at).trim(), body: chunk.slice(at + 1) }];
  });
}

describe('/dispatch fleet cards + hero CTA (NEPO-41)', () => {
  it('fleet card is a wrapping flex ≤1023px so hidden fields collapse the card', () => {
    // Chunk rule đứng sau media-opener nên matcher theo body, không theo text media.
    const rowRule = rules(dispatchCss)
      .find((r) => r.selector.trim().endsWith('.fleet-row') && r.body.includes('flex-wrap: wrap'));
    expect(rowRule, 'fleet-row flex rule ≤1023px missing').toBeTruthy();
    expect(rowRule!.body).toMatch(/display:\s*flex/);
    expect(rowRule!.body).toMatch(/padding:\s*12px/);
  });

  it('hides empty dash fields on the card (Khách: — / Tuyến: — never eat rows)', () => {
    const hideRule = rules(dispatchCss).find((r) => r.selector.includes('.fleet-col-route:has(.fleet-dash)'));
    expect(hideRule, 'empty-field hiding rule missing').toBeTruthy();
    expect(hideRule!.selector).toContain('.fleet-col-cust:has(.fleet-dash)');
    expect(hideRule!.body).toMatch(/display:\s*none/);
  });

  it('hero row wraps so Tạo chuyến mới stays inside the hero padding', () => {
    const heroRule = rules(dispatchCss)
      .find((r) => r.selector.includes('.hero--dispatch-compact .hero-row'));
    expect(heroRule, 'hero-row rule missing').toBeTruthy();
    expect(heroRule!.body).toMatch(/flex-wrap:\s*wrap/);
  });
});
