// NEPO-12 — the Khách hàng cell must lay out horizontally. `.trip-col` base
// sets flex-direction: column for every cell; if `.trip-col--customer` ever
// loses its explicit `flex-direction: row`, the name span (flex: 1 1 0)
// collapses to height 0 on the vertical main axis — Khách hàng renders blank
// while the Xe ngoài pill (flex: 0 0 auto) stays visible, exactly the demo
// bug this ticket fixed (probe 24/10: height 0 → 30.8px once row is set).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// vitest runs with `frontend/` as cwd (jsdom makes import.meta.url non-file),
// so resolve the stylesheet from the package root.
const tableCss = readFileSync(resolve(process.cwd(), 'src/pages/trip-list/table.css'), 'utf8');

/** Body of the first CSS rule whose selector appears immediately before `{`. */
function rule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

describe('trip-list customer column layout (NEPO-12)', () => {
  it('pins flex-direction: row on the customer cell (must not inherit column from .trip-col)', () => {
    expect(rule(tableCss, '.trip-list-page .trip-col--customer')).toMatch(/flex-direction\s*:\s*row/);
  });

  it('keeps the flex-basis-0 name span safe: the clamp rule carries flex: 1 1 0 only alongside row direction', () => {
    // The 2-line-clamp rule (the SECOND .trip-customer-name block, identified
    // by its -webkit-line-clamp declaration) relies on flex: 1 1 0; that basis
    // is only harmful on a vertical main axis, so the pair is safe together.
    const clampRule = tableCss.match(
      /\.trip-list-page \.trip-col--customer \.trip-customer-name\s*\{[^}]*-webkit-line-clamp[^}]*\}/,
    )?.[0] ?? '';
    expect(clampRule).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });
});
