/**
 * Sanity guard for the trip form's "Đơn giá thực tế" (đ/lít) field.
 *
 * `computeTripTotals` derives `totalFuelCost = liters × price`, and the trip
 * lock books exactly that as a fuel payable. A fat-fingered pump price — 225
 * instead of 22.500 — therefore books a nonsense debt: 225 lít became 50.625đ
 * on TRP-202610-0010 and showed up in the supplier statement as ~225đ/lít
 * (kanban 081026232520).
 *
 * Diesel is never priced in the hundreds of đồng, so a floor catches the typo
 * without touching real pump prices (VN ~20.000–30.000 đ/lít). Returns the
 * message to show, or null when the value is absent/plausible.
 */
export function fuelPriceSanityError(actualPrice: number | null | undefined): string | null {
  if (actualPrice == null || actualPrice <= 0 || actualPrice >= 1000) return null;
  return `Đơn giá thực tế ${actualPrice.toLocaleString('vi-VN')} đ/lít có vẻ sai. Kiểm tra lại (đơn giá dầu thường trên 10.000 đ/lít).`;
}
