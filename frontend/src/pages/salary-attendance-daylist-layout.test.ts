// NEPO-10 — the mobile day list (viewport ≤1023px) must use a 2-column card
// grid instead of full-width separator rows, collapse to 1 column on narrow
// phones (≤640px), and keep the legend full-width below the grid. CSS
// contract test pinning the ticket's acceptance criteria.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const responsiveCss = readFileSync(resolve(process.cwd(), 'src/pages/salary-attendance/responsive.css'), 'utf8');

/** Body of the first CSS rule whose selector list starts with `selector`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

function decl(block: string, property: string): string | null {
  if (!block) return null;
  const match = block.match(new RegExp(`${property}\\s*:\\s*([^;]+)`));
  return match ? match[1].trim() : null;
}

/** Full body of the first `@media (max-width: Npx)` block, brace-matched. */
function mediaBlock(css: string, maxWidth: number): string {
  const start = css.indexOf(`@media (max-width: ${maxWidth}px)`);
  if (start === -1) return '';
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i);
  }
  return '';
}

const wide = mediaBlock(responsiveCss, 1023);
const narrow = mediaBlock(responsiveCss, 640);

describe('NEPO-10 layout — day list 2 cột 641-1023px, 1 cột ≤640px', () => {
  it('≤1023px: .mobile-day-list is a 2-column grid with a gap', () => {
    const list = rule(wide, '.mobile-day-list');
    expect(decl(list, 'display')).toBe('grid');
    expect(decl(list, 'grid-template-columns')).toBe('repeat(2, minmax(0, 1fr))');
    expect(decl(list, 'gap')).toBeTruthy();
  });

  it('≤1023px: each day is its own card (surface bg, line border, ~10px radius)', () => {
    const row = rule(wide, '.mobile-day-row');
    expect(decl(row, 'background')).toBe('var(--surface)');
    expect(decl(row, 'border')).toBe('1px solid var(--line)');
    expect(decl(row, 'border-radius')).toBe('10px');
    // separator-style shared border must be gone
    expect(decl(row, 'border-bottom')).toBeNull();
  });

  it('≤1023px: status strip survives as the 3px left indicator', () => {
    const strip = rule(wide, '.mobile-day-row::before');
    expect(decl(strip, 'width')).toBe('3px');
    expect(decl(strip, 'background')).toBeTruthy();
  });

  it('≤1023px: legend spans the full grid width', () => {
    const legend = rule(wide, '.mobile-day-legend');
    expect(decl(legend, 'grid-column')).toBe('1 / -1');
  });

  it('≤640px: grid drops back to a single column (narrow phones)', () => {
    const list = rule(narrow, '.mobile-day-list');
    expect(decl(list, 'grid-template-columns')).toBe('1fr');
  });
});
