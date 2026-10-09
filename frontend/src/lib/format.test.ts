import { describe, it, expect } from 'vitest';
import { formatAmount, formatCurrency, moneyParts } from './format';

/**
 * `formatAmount` replaces the `formatCurrency(n).replace(' ₫', '')` idiom that
 * was scattered across the UI (kanban 091026235520). Two behaviours matter:
 * the digits must match `formatCurrency` exactly, and a value that `formatCurrency`
 * would decorate must NOT acquire a unit here.
 */
describe('formatAmount', () => {
  it('renders the same digits as formatCurrency, without the unit', () => {
    expect(formatAmount(331451555)).toBe('331.451.555');
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(1000)).toBe('1.000');
    // Same numeric part as the currency form — only the unit differs.
    expect(formatCurrency(331451555).replace(' ₫', '')).toBe(formatAmount(331451555));
  });

  it('accepts the string amounts the API returns', () => {
    expect(formatAmount('2250000')).toBe('2.250.000');
  });

  it('falls back to an em dash rather than "NaN"', () => {
    expect(formatAmount(null)).toBe('—');
    expect(formatAmount('abc')).toBe('—');
  });

  it('never emits the old glued "…đ" the summary card used to render', () => {
    expect(`${formatAmount(331451555)}đ`).not.toBe(formatCurrency(331451555));
  });
});

/**
 * `moneyParts` is what the payable summary now uses instead of slicing the
 * formatted string by hand, so the unit keeps its leading space at every scale.
 */
describe('moneyParts', () => {
  it('keeps a space between the digits and the unit', () => {
    const full = moneyParts(331451555, false);
    expect(full.num).toBe('331.451.555');
    expect(full.unit).toBe('₫');
    expect(`${full.num} ${full.unit}`).toBe(formatCurrency(331451555));
  });

  it('scales compact mode without gluing the suffix', () => {
    expect(moneyParts(2_500_000, true).unit).toBe('tr ₫');
    expect(moneyParts(3_000_000_000, true).unit).toBe('tỷ ₫');
    expect(moneyParts(900, true).unit).toBe('₫');
  });
});