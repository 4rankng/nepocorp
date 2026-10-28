// NEPO-36 (id 659) — mobile tap-target doctrine contract (shipmate-uiux).
// Mọi interactive element ≤768px phải có hit area ≥ 44×44; visual nhỏ được
// phép giữ nếu hit area mở rộng bằng padding/::before. Pin này cấm tái diễn
// control 36px/40px/17px trên mobile. Desktop ≥769px không thay đổi.
import tokensCss from './tokens.css?raw';
import responsiveCss from './responsive.css?raw';
import { describe, expect, it } from 'vitest';

// Lấy body của mọi block @media (max-width: 768px) — comment đã strip.
function mediaBodies(css: string, query: string): string[] {
  const out: string[] = [];
  const needle = `@media ${query}`;
  let i = css.indexOf(needle);
  while (i !== -1) {
    const open = css.indexOf('{', i);
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      if (css[j] === '}') depth -= 1;
      j += 1;
    }
    out.push(css.slice(open + 1, j - 1));
    i = css.indexOf(needle, j);
  }
  return out;
}

const tapBodies = mediaBodies(responsiveCss.replace(/\/\*[\s\S]*?\*\//g, ''), '(max-width: 768px)');
const tokenBodies = mediaBodies(tokensCss.replace(/\/\*[\s\S]*?\*\//g, ''), '(max-width: 768px)');

describe('mobile tap-target doctrine ≤768px (NEPO-36)', () => {
  it('lifts the control token to 44px at the doctrine edge', () => {
    const joined = tokenBodies.join('\n');
    expect(joined).toMatch(/--control-h:\s*44px/);
  });

  it('floors every tappable control to ≥44px height', () => {
    const floor = tapBodies.find((b) => b.includes('min-height: 44px') && b.includes('#root button'));
    expect(floor).toBeTruthy();
    for (const sel of ['#root button', '#root a[href]', '#root select', '#root textarea']) {
      expect(floor!).toContain(sel);
    }
    // sr-only helper inputs (date picker source) must stay 1px.
    expect(floor!).toContain('.ds-date-input__native');
  });

  it('floors button width for icon-only controls (toolbar +/⋮)', () => {
    const width = tapBodies.find((b) => b.includes('min-width: 44px') && b.includes('#root button'));
    expect(width).toBeTruthy();
  });

  it('derives topbar chrome from a 52px bar so calc(--topbar-h)−8 lands on 44px', () => {
    const joined = tapBodies.join('\n');
    expect(joined).toMatch(/--topbar-h:\s*52px/);
  });

  it('redraws checkbox/radio as 44×44 with a 22px glyph (input has no pseudo)', () => {
    const joined = tapBodies.join('\n');
    expect(joined).toContain('input[type="checkbox"]');
    expect(joined).toContain('input[type="radio"]');
    expect(joined).toMatch(/appearance:\s*none/);
    expect(joined).toMatch(/width:\s*44px/);
    expect(joined).toMatch(/height:\s*44px/);
    expect(joined).toMatch(/22px 22px no-repeat/);
  });

  it('sizes leaflet zoom controls to 44×44 globally (page CSS is code-split)', () => {
    const joined = tapBodies.join('\n');
    expect(joined).toContain('leaflet-control-zoom');
    expect(joined).toMatch(/#root \.leaflet-control-zoom a[\s\S]*?width:\s*44px/);
  });

  it('expands map-marker and drawn-checkbox hit areas with ::before, keeping visuals', () => {
    const joined = tapBodies.join('\n');
    expect(joined).toContain('.leaflet-marker-icon.custom-map-marker::before');
    expect(joined).toContain('#root .checkbox::before');
  });
});
