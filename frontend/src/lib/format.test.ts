import { describe, it, expect } from 'vitest';
import { formatAmount, formatCurrency, moneyParts, parseAmount } from './format';

/**
 * `parseAmount` is the inverse of `formatCurrency`/`formatNumber`, and reading
 * a vi-VN amount back is where it earns its place: the dot groups thousands and
 * the comma is the decimal mark, the opposite of what `parseFloat` reads.
 * Without it a 5.159.636 ₫ row was recorded as 5.159 in the .xlsx export and the
 * printed totals row, and their sum came out 405,159 (kanban 101026102000).
 */
describe('parseAmount', () => {
  it('reads a vi-VN grouped amount with either unit', () => {
    expect(parseAmount('5.159.636 ₫')).toBe(5_159_636);
    expect(parseAmount('5.159.636 đ')).toBe(5_159_636);
    expect(parseAmount('250.000 ₫')).toBe(250_000);
  });

  it('reads the vi-VN decimal comma, not the dot', () => {
    expect(parseAmount('5,5')).toBe(5.5);
    expect(parseAmount('1.234,5 ₫')).toBe(1_234.5);
  });

  it('treats a 3-digit group as thousands, so 1.234 is 1234', () => {
    expect(parseAmount('1.234')).toBe(1_234);
    // …while a 1-2 digit tail is a decimal point.
    expect(parseAmount('1.5')).toBe(1.5);
    expect(parseAmount('12.34')).toBe(12.34);
  });

  it('keeps the sign of a negative amount', () => {
    expect(parseAmount('-250.000 ₫')).toBe(-250_000);
    expect(parseAmount('-1.234,56 ₫')).toBe(-1_234.56);
  });

  it('passes a plain number through', () => {
    expect(parseAmount(5_159_636)).toBe(5_159_636);
    expect(parseAmount(0)).toBe(0);
    expect(parseAmount('2250000')).toBe(2_250_000);
  });

  it('returns null for a cell that holds no amount', () => {
    expect(parseAmount('—')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount(null)).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
    expect(parseAmount(NaN)).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });

  it('round-trips every amount formatCurrency produces', () => {
    for (const amount of [0, 999, 1_000, 5_159_636, 331_451_555, -2_500_000, 1_234.56]) {
      expect(parseAmount(formatCurrency(amount))).toBe(amount);
    }
  });
});

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