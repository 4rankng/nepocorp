// NEPO-9 — one status = one color on every surface of the salary-attendance
// screen. The calendar cells (salary-attendance/calendar.css) are the source
// of truth; the mobile day-list badge (STATUS_CONFIG), the row strip and both
// legends must carry the same palette. Guards against token/hex drift like
// the amber-vs-slate "Chờ việc" mismatch this ticket fixed.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STATUS_CONFIG } from './salary-attendance-constants';

// vitest runs with `frontend/` as cwd (jsdom makes import.meta.url non-file),
// so resolve the sibling stylesheets from the package root.
const calendarCss = readFileSync(resolve(process.cwd(), 'src/pages/salary-attendance/calendar.css'), 'utf8');
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

const cellBlock = (status: string) => rule(calendarCss, `.cal-cell.status-${status}`);
const stripBlock = (status: string) => rule(responsiveCss, `.mobile-day-row.status-${status}::before`);
const mobileLegendBlock = (status: string) => rule(responsiveCss, `.mobile-day-legend__item.status-${status}`);
const desktopLegendBlock = (nth: number) => rule(calendarCss, `.calendar-legend-item:nth-child(${nth})`);

const STATUS_KEYS = ['TRIP_DAY', 'STANDBY', 'PERSONAL_LEAVE', 'WEEKLY_OFF'] as const;
type StatusKey = (typeof STATUS_KEYS)[number];
const cssStatus: Record<StatusKey, string> = {
  TRIP_DAY: 'trip_day',
  STANDBY: 'standby',
  PERSONAL_LEAVE: 'personal_leave',
  WEEKLY_OFF: 'weekly_off',
};

describe('NEPO-9 palette — day list matches calendar (NEPO-7)', () => {
  it('STATUS_CONFIG badge bg/color equals the calendar cell palette', () => {
    for (const key of STATUS_KEYS) {
      const cell = cellBlock(cssStatus[key]);
      expect(decl(cell, 'background'), `${key} cell background`).toBe(STATUS_CONFIG[key].bg);
      // WEEKLY_OFF text uses var(--ink-3) on both surfaces — token equality counts.
      expect(decl(rule(calendarCss, `.cal-cell.status-${cssStatus[key]} .cal-cell-day-num`), 'color'), `${key} text color`)
        .toBe(STATUS_CONFIG[key].color);
    }
  });

  it('Chờ việc (STANDBY) is neutral slate everywhere — no amber warning tokens', () => {
    expect(STATUS_CONFIG.STANDBY.bg.toUpperCase()).toBe('#F4F6F5');
    expect(STATUS_CONFIG.STANDBY.color.toUpperCase()).toBe('#46554D');

    const configValues = Object.values(STATUS_CONFIG).flatMap((c) => [c.bg, c.color]);
    expect(configValues.every((v) => !v.includes('warning')), 'no STATUS_CONFIG warning token').toBe(true);

    const strip = stripBlock('standby');
    expect(strip, 'standby strip rule exists').not.toBe('');
    expect(decl(strip, 'background')).toBe('#CBD6D0');
    expect(strip.includes('warning')).toBe(false);
  });

  it('row strip colors equal the calendar cell border palette', () => {
    // TRIP keeps the semantic success token (green family) by spec.
    expect(decl(stripBlock('trip_day'), 'background')).toBe('var(--success)');
    for (const key of (['STANDBY', 'PERSONAL_LEAVE', 'WEEKLY_OFF'] as const)) {
      expect(decl(stripBlock(cssStatus[key]), 'background'), `${key} strip`).toBe(decl(cellBlock(cssStatus[key]), 'border-color'));
    }
    expect(decl(stripBlock('standby'), 'background')).toBe('#CBD6D0');
    expect(decl(stripBlock('personal_leave'), 'background')).toBe('#E8B9C0');
    expect(decl(stripBlock('weekly_off'), 'background')).toBe('#D8DEDA');
  });

  it('mobile legend tints equal desktop legend tints and the cell palette', () => {
    // Desktop legend order = STATUS_CONFIG order: TRIP, STANDBY, PERSONAL, WEEKLY.
    const nth: Record<StatusKey, number> = { TRIP_DAY: 1, STANDBY: 2, PERSONAL_LEAVE: 3, WEEKLY_OFF: 4 };
    for (const key of STATUS_KEYS) {
      const mobile = mobileLegendBlock(cssStatus[key]);
      const desktop = desktopLegendBlock(nth[key]);
      expect(mobile, `mobile legend ${key}`).not.toBe('');
      expect(desktop, `desktop legend ${key}`).not.toBe('');
      expect(decl(mobile, 'color')).toBe(decl(desktop, 'color'));
      expect(decl(mobile, 'background')).toBe(decl(desktop, 'background'));
      expect(decl(mobile, 'border-color')).toBe(decl(desktop, 'border-color'));
      expect(decl(mobile, 'background')).toBe(STATUS_CONFIG[key].bg);
      expect(decl(mobile, 'color')).toBe(STATUS_CONFIG[key].color);
    }
  });
});
