/**
 * Filter-bar grid-rebuild regression tests (kanban 20260925_8).
 *
 * The CHIEF complaints — date-pair floating off as a separate white panel at
 * wide viewports, controls mis-aligned across rows, Tổng quan + Chi tiết pages
 * out of sync — all reduced to one CSS fact: every filter bar with a date pair
 * must lay out as a REAL CSS grid where the pair is a single, transparent
 * grid item. The previous flex-based "fix" (card _5) was insufficient because
 * flex items can grow independently and a wrapped flex line reads as a new
 * panel at 1920+. Grid items stay in their cell; the pair wrapper cannot drift.
 *
 * These tests read the CSS files as text and assert the structural invariants
 * so a future patch that drops the grid (or adds a background to the pair)
 * will be rejected. jsdom cannot run layout, so a true rendering check lives
 * in the puppeteer screenshot pass before commit.
 *
 * Scope note (2026-11-12, post merge 5544c5e8): the grid rebuild survives only
 * on ForwarderTripsPage. The expense page kept main's NEPO-24 toolbar redesign
 * (single-row toolbar + popover/sheet filters), which replaced the multi-row
 * filter bar this card targeted; and fwd date inputs now render through the
 * shared DateInput (kanban 101026101520), so no page-specific input css exists.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const PAGES_DIR = dirname(fileURLToPath(import.meta.url));
const fwdCss = readFileSync(resolve(PAGES_DIR, 'ForwarderTripsPage.css'), 'utf8');

describe('filter-bar grid rebuild (kanban 20260925_8)', () => {
  describe('ForwarderTripsPage filter', () => {
    it('uses display: grid on the filter bar (not flex)', () => {
      const filterBar = fwdCss.match(/\.fwd-trip-filters\s*\{[^}]*\}/);
      expect(filterBar, '.fwd-trip-filters block missing').toBeTruthy();
      expect(filterBar![0]).toMatch(/display:\s*grid/);
      // Source-order guard: the desktop grid rule MUST come before any
      // mobile @media so the @media cascade still works.
      const gridIdx = fwdCss.indexOf('.fwd-trip-filters {');
      const mobileIdx = fwdCss.indexOf('@media (max-width: 767px)', gridIdx);
      expect(mobileIdx).toBeGreaterThan(gridIdx);
    });

    it('date pair is a grid item containing 2 dates (1fr 1fr), transparent', () => {
      const pair = fwdCss.match(/\.fwd-trip-filters__dates\s*\{[^}]*\}/);
      expect(pair, '.fwd-trip-filters__dates block missing').toBeTruthy();
      expect(pair![0]).toMatch(/display:\s*grid/);
      expect(pair![0]).toMatch(/grid-template-columns:\s*1fr\s+1fr/);
      // The pair must NEVER paint its own background or border — that is
      // exactly the "white panel floating off" regression.
      expect(pair![0]).toMatch(/background:\s*transparent/);
      expect(pair![0]).toMatch(/border:\s*0/);
    });

    it('declares 768-1279 tablet (2-col) and <768 mobile (1-col) breakpoints', () => {
      expect(fwdCss).toMatch(/@media\s*\(max-width:\s*1279px\)\s*and\s*\(min-width:\s*768px\)/);
      expect(fwdCss).toMatch(/@media\s*\(max-width:\s*767px\)/);
    });

    it('page-specific date input css, if re-added, keeps the control-h token', () => {
      // Since kanban 101026101520 the date fields render through the shared
      // DateInput and this page defines no input css at all. If a future patch
      // reintroduces a page-specific override, it must keep height coherence.
      const input = fwdCss.match(/\.fwd-trip-filters__date\s+input\s*\{[^}]*\}/);
      if (!input) return;
      expect(input[0]).toMatch(/height:\s*var\(--control-h\)/);
      expect(input[0]).toMatch(/min-height:\s*var\(--control-h\)/);
    });

    it('search cell has min-width: 0 so the grid can shrink it under pressure', () => {
      const search = fwdCss.match(/\.fwd-trip-filters__search\s*\{[^}]*\}/);
      expect(search, '.fwd-trip-filters__search block missing').toBeTruthy();
      expect(search![0]).toMatch(/min-width:\s*0/);
    });
  });

  // ExpenseListPage assertions removed 2026-11-12: main's NEPO-24 toolbar
  // redesign (single-row toolbar + popover/sheet filters, commit 778b81e0)
  // replaced the multi-row .expense-filter-bar this card rebuilt. The grid
  // invariants apply to ForwarderTripsPage only.

  describe('shared invariant: pair wrappers cannot paint chrome', () => {
    // CHIEF's evidence showed a white panel floating off the filter row.
    // The pair wrapper MUST be background- and border-free so the
    // pair blends into the filter bar at every viewport.
    for (const [label, selector, css] of [
      ['fwd-trip-filters__dates', '.fwd-trip-filters__dates', fwdCss],
    ] as const) {
      it(`${label} has no background-color, no 1px border, no border-radius`, () => {
        const m = css.match(new RegExp(`\\${selector}\\s*\\{[^}]*\\}`));
        expect(m, `${selector} block missing`).toBeTruthy();
        expect(m![0]).not.toMatch(/background-color:\s*var\(--surface/);
        expect(m![0]).not.toMatch(/border:\s*1px/);
        // border-radius:0 is allowed; any non-zero radius would re-create the panel.
        const radiusMatch = m![0].match(/border-radius:\s*([^;]+);/);
        expect(
          !radiusMatch || radiusMatch[1].trim() === '0',
          `${selector} must not have a non-zero border-radius (regression: pair would render as a chip)`
        ).toBe(true);
      });
    }
  });
});
