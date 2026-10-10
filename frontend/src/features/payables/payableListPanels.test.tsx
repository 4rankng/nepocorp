import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { PayableSummary, Supplier } from '@tingting/shared';
import { formatCurrency, moneyParts } from '../../lib/format';
import { AGING_BUCKET_LABELS, type PayablesAgingTotals } from './payableListUtils';
import { PayableAgingGrid, PayableHeroKpiRow } from './payableListPanels';
import { PayableDesktopTable, PayableMobileCardList } from './payableListRows';

/**
 * Regression: kanban 101026102020 — the /payables aging surface spelled one
 * bucket two ways ("0–30 ngày" beside "0-30 ngày", "Trên 90 ngày" beside
 * ">90 ngày"), glued a number to the following word ("6nhà cung cấp", "4NCC"),
 * and its value read "311.270.004₫" where every table cell read
 * "311.270.004 ₫".
 *
 * These assertions read `textContent`, not a screenshot: the whole defect was
 * invisible in pixels (a CSS `gap` supplied the visual space the DOM lacked),
 * so only the text stream proves it.
 */

function supplier(id: number, name: string): Supplier {
  return {
    id, name, shortName: null, contactPerson: null, phone: null, taxCode: null,
    note: null, status: 'ACTIVE', linkedCustomerId: null, isFuelSupplier: false,
    createdAt: '', updatedAt: '', deletedAt: null,
  };
}

function row(id: number, name: string, totalOutstanding: number, aging: PayableSummary['aging']): PayableSummary {
  return { supplier: supplier(id, name), totalOutstanding, aging, maxOverdueDays: 5, kind: 'vendor' };
}

const TOTALS: PayablesAgingTotals = {
  total: 311_270_004,
  current: 311_270_004,
  d30: 0,
  d60: 0,
  over90: 0,
  currentCount: 6,
  d30Count: 0,
  d60Count: 0,
  over90Count: 0,
  supplierCount: 6,
  overdueCount: 1,
};

const PAYABLE = row(1, 'NCC AN KHÁNH', 311_270_004, { current: 311_270_004, d30: 0, d60: 0, over90: 0 });

function renderAgingGrid() {
  return render(
    <MemoryRouter>
      <PayableAgingGrid
        totals={TOTALS}
        currentMoney={moneyParts(TOTALS.current, false)}
        d30Money={moneyParts(TOTALS.d30, false)}
        d60Money={moneyParts(TOTALS.d60, false)}
        over90Money={moneyParts(TOTALS.over90, false)}
      />
    </MemoryRouter>,
  );
}

function renderTable() {
  return render(
    <MemoryRouter>
      <PayableDesktopTable payables={[PAYABLE]} />
    </MemoryRouter>,
  );
}

/** The four bucket headers, in order, between "Tổng nợ" and the chevron column. */
function tableBucketLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll('thead th')]
    .slice(2, 6)
    .map(th => th.textContent ?? '');
}

/**
 * Elements that a browser renders as one text flow, so a digit at the end of
 * one child and a word at the start of the next really do read glued. Blocks
 * (`<td>`, `<tr>`, `<div>` stacks) are excluded: their children start a new
 * line, so no space is expected between them.
 */
const INLINE: Record<string, true> = {
  SPAN: true, A: true, B: true, STRONG: true, EM: true, I: true,
  SMALL: true, SUP: true, SUB: true, CODE: true, BUTTON: true,
};

function textFlowElements(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (el: HTMLElement) => {
    const children = [...el.childNodes];
    const isFlow = children.length > 0 && children.every(node =>
      node.nodeType === Node.TEXT_NODE ||
      (node.nodeType === Node.ELEMENT_NODE && INLINE[(node as Element).tagName] === true));
    if (isFlow) out.push(el);
    for (const node of children) {
      if (node.nodeType === Node.ELEMENT_NODE) walk(node as HTMLElement);
    }
  };
  walk(root);
  return out;
}

/** Every "digit immediately followed by a letter" in the rendered text flow. */
function gluedNumberWord(root: HTMLElement): string[] {
  return textFlowElements(root)
    .map(el => el.textContent ?? '')
    .filter(text => /\d\p{L}/u.test(text));
}

describe('payables aging buckets — one dash, one label (101026102020)', () => {
  it('renders the shared AGING_BUCKET_LABELS in the aging cards', () => {
    const { container } = renderAgingGrid();

    expect([...container.querySelectorAll('.aging-card__label')].map(el => el.textContent))
      .toEqual([...AGING_BUCKET_LABELS]);
  });

  it('renders the same four labels in the table header as in the cards', () => {
    const cards = renderAgingGrid();
    const cardLabels = [...cards.container.querySelectorAll('.aging-card__label')].map(el => el.textContent);
    cards.unmount();

    const { container } = renderTable();
    expect(tableBucketLabels(container)).toEqual(cardLabels);
    expect(tableBucketLabels(container)).toEqual([...AGING_BUCKET_LABELS]);
  });

  it('never spells a bucket with an ASCII hyphen or a ">" in either place', () => {
    const cards = renderAgingGrid();
    const cardLabels = [...cards.container.querySelectorAll('.aging-card__label')].map(el => el.textContent ?? '');
    cards.unmount();
    const { container } = renderTable();
    const labels = [...cardLabels, ...tableBucketLabels(container)];

    for (const label of labels) {
      expect(label).not.toContain('-');
      expect(label).not.toContain('>');
    }
    // En dash (U+2013) on the three ranges, and the word — not the glyph — on >90.
    for (const label of cardLabels.slice(0, 3)) expect(label).toContain('\u2013');
    expect(cardLabels[3]).toBe('Trên 90 ngày');
  });
});

describe('payables aging cards — a real space, never a glue (101026102020)', () => {
  it('keeps a space between the count and "nhà cung cấp"', () => {
    const { container } = renderAgingGrid();

    const counts = [...container.querySelectorAll('.aging-card__count')].map(el => el.textContent);
    expect(counts).toEqual([
      '6 nhà cung cấp',
      '0 nhà cung cấp',
      '0 nhà cung cấp',
      '0 nhà cung cấp',
    ]);
    for (const count of counts) expect(count).toMatch(/^\d+ nhà cung cấp$/);
  });

  it('carries the ₫ unit with a space before it on every bucket value', () => {
    const { container } = renderAgingGrid();

    const values = [...container.querySelectorAll('.aging-card__value')].map(el => el.textContent);
    expect(values[0]).toBe('311.270.004 ₫');
    for (const value of values) {
      expect(value).toContain('₫');
      expect(value).toMatch(/^[\d.]+ ₫$/); // exactly one space, never "311.270.004₫"
      expect(value).not.toMatch(/[\d.]₫/);
    }
  });

  it('reads the same money shape as a table cell', () => {
    const { container } = renderTable();

    const totalCell = container.querySelector('tbody td.num');
    expect(totalCell?.textContent).toBe(formatCurrency(311_270_004));
    expect(totalCell?.textContent).toBe('311.270.004 ₫');
  });

  it('never leaves a digit glued to a following letter in the hero KPIs', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableHeroKpiRow totals={TOTALS} heroMoney={moneyParts(TOTALS.total, false)} />
      </MemoryRouter>,
    );

    expect(container.querySelector('.hero-kpi-card__subtitle')?.textContent)
      .toBe('6 nhà cung cấp · cập nhật vừa xong');
    const minis = [...container.querySelectorAll('.hero-kpi-mini__body')].map(el => el.textContent ?? '');
    expect(minis).toEqual(['1 quá hạn', '6 nhà cung cấp']);
  });

  it('leaves no digit glued to a following letter anywhere in the aging grid', () => {
    const { container } = renderAgingGrid();
    // The scan must actually have text flows to inspect, or it proves nothing.
    expect(textFlowElements(container).length).toBeGreaterThanOrEqual(12);
    expect(gluedNumberWord(container)).toEqual([]);
  });

  it('leaves no digit glued to a following letter in the hero KPIs', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableHeroKpiRow totals={TOTALS} heroMoney={moneyParts(TOTALS.total, false)} />
      </MemoryRouter>,
    );
    expect(gluedNumberWord(container)).toEqual([]);
  });

  it('leaves no digit glued to a following letter in the desktop table', () => {
    const { container } = renderTable();
    expect(textFlowElements(container).length).toBeGreaterThanOrEqual(8);
    expect(gluedNumberWord(container)).toEqual([]);
  });

  it('keeps the mobile card name and amount apart, and reads "58 ngày"', () => {
    const { container } = render(
      <MemoryRouter>
        <PayableMobileCardList payables={[{ ...PAYABLE, maxOverdueDays: 58 }]} />
      </MemoryRouter>,
    );

    expect(container.querySelector('.m-card__top')?.textContent).toBe('NCC AN KHÁNH 311.270.004 ₫');
    expect(container.querySelector('.m-card__row')?.textContent).toBe('Tuổi nợ lớn nhất 58 ngày');
    expect(gluedNumberWord(container)).toEqual([]);
  });

  it('the glue scan detects the exact strings the reporter saw', () => {
    // Guards the guard: "6nhà cung cấp" and "4NCC" are the reported defects, so
    // the scan must find them if the markup ever regresses to that shape.
    const host = document.createElement('div');
    host.innerHTML = '<span>6nhà cung cấp</span><span>4NCC</span>';
    expect(gluedNumberWord(host)).toContain('6nhà cung cấp');
    expect(gluedNumberWord(host)).toContain('4NCC');
  });
});
