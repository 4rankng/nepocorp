// NEPO-38 (id 661) — WCAG AA contrast contract for text tokens on light
// surfaces (shipmate-uiux). Token màu dùng cho text thường phải đạt ≥4.5:1
// trên trắng, canvas --bg và soft tint của app; large text ≥3:1. Pin này cấm
// tái diễn badge/số tiền/link phụ fail AA ngoài nắng (đo DOM 390+768).
import tokensCss from './tokens.css?raw';
import dashboardCss from '../pages/DashboardPage.css?raw';
import financeCss from '../pages/FinancePage.css?raw';
import sidebarCss from '../components/layout/sidebar.css?raw';
import { describe, expect, it } from 'vitest';

// WCAG 2.x relative luminance + contrast ratio.
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const chan = (i: number) => {
    const v = parseInt(h.slice(i * 2, i * 2 + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * chan(0) + 0.7152 * chan(1) + 0.0722 * chan(2);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function tokenValue(css: string, name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  expect(m, `token --${name} not found`).toBeTruthy();
  return m![1];
}

// Nền sáng của app: trắng (card/field), canvas --bg, inset --surface-2 và soft
// tint nơi badge/chip thường trú.
const LIGHT = {
  white: '#FFFFFF',
  canvas: '#E3E8E5',
  surface2: '#EDF1EE',
};

describe('text tokens clear WCAG AA on light surfaces (NEPO-38)', () => {
  it('--success (số tiền, trạng thái hợp lệ) ≥4.5:1 everywhere incl. its soft tint', () => {
    const v = tokenValue(tokensCss, 'success');
    for (const bg of [...Object.values(LIGHT), '#D9F2E3']) {
      expect(contrast(v, bg), `${v} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('--ink-4 (mô tả phụ, placeholder) ≥4.5:1 on white and canvas', () => {
    const v = tokenValue(tokensCss, 'ink-4');
    for (const bg of Object.values(LIGHT)) {
      expect(contrast(v, bg), `${v} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('--wf-red and --wf-blue (badge KPI, link phụ) ≥4.5:1 on canvas and their soft tints', () => {
    for (const css of [dashboardCss, financeCss]) {
      const red = tokenValue(css, 'wf-red');
      const blue = tokenValue(css, 'wf-blue');
      for (const bg of [LIGHT.canvas, LIGHT.white, '#FBE5E3', '#E8EFFD']) {
        expect(contrast(red, bg), `${red} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(blue, bg), `${blue} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('nav badge count is text — never the graphics-only --accent', () => {
    const badgeRule = sidebarCss.replace(/\/\*[\s\S]*?\*\//g, '')
      .split('}')
      .find((chunk) => chunk.includes('.nav-item__badge'));
    expect(badgeRule).toBeTruthy();
    expect(badgeRule!).not.toMatch(/color:\s*var\(--accent\)/);
  });
});
