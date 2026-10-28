// NEPO-37 (id 660) — mobile form-font contract (shipmate-uiux): input/select/
// textarea phải ≥16px at-rest ≤768px để iOS WebKit không auto-zoom khi focus.
// Pin này cấm tái diễn control 11–12px gây zoom. Desktop ≥769px giữ dense
// 12px control type — ngoài scope.
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

const fontBodies = mediaBodies(responsiveCss.replace(/\/\*[\s\S]*?\*\//g, ''), '(max-width: 768px)');
const tokenBodies = mediaBodies(tokensCss.replace(/\/\*[\s\S]*?\*\//g, ''), '(max-width: 768px)');

describe('mobile form fonts ≤768px (NEPO-37)', () => {
  it('pins the 16px floor token', () => {
    expect(tokenBodies.join('\n') + tokensCss).toMatch(/--fs-ios-focus:\s*16px/);
  });

  it('renders input/select/textarea at the floor at rest, not only while focused', () => {
    const block = fontBodies.find((b) => b.includes('font-size: var(--fs-ios-focus)'));
    expect(block).toBeTruthy();
    expect(block!).not.toContain(':focus');
    for (const sel of ['#root input', '#root select', '#root textarea', '.modal input', '.drawer input']) {
      expect(block!).toContain(sel);
    }
  });

  it('excludes text-less controls (drawn checkbox/radio, clipped date source)', () => {
    const block = fontBodies.find((b) => b.includes('font-size: var(--fs-ios-focus)'))!;
    expect(block).toContain('not([type="checkbox"])');
    expect(block).toContain('not([type="radio"])');
    expect(block).toContain('.ds-date-input__native');
  });

  it('scopes the floor to ≤768px so desktop keeps the dense 12px control type', () => {
    const all = responsiveCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const focused = all.match(/font-size:\s*var\(--fs-ios-focus\)/g) || [];
    expect(focused).toHaveLength(1);
    expect(mediaBodies(all, '(min-width: 769px)').join('\n')).not.toContain('--fs-ios-focus');
  });
});
