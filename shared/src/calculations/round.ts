/**
 * Banker-safe rounding helper to 2 decimal places.
 * Employs scientific notation to bypass floats representation/tie boundaries issues.
 * Symmetric for negative numbers.
 */
export function round2dp(n: number): number {
  const sign = Math.sign(n);
  const absN = Math.abs(n);
  return sign * Number(Math.round(parseFloat(absN + 'e2')) + 'e-2');
}
