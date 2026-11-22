/**
 * Shipment (Lô hàng) auto-code — NEPO-61.
 *
 * Format: [Mã KH][Năm][STT], e.g. MCT26026 = prefix "MCT" + year "26" + seq "026".
 * The prefix is the customer's shortName (Mã KH): diacritics stripped, uppercased,
 * A–Z0–9 only, 2–6 chars. The sequence is per customer+year, zero-padded to 3
 * digits (grows beyond 3 digits if a customer ever exceeds 999 shipments/year —
 * never truncate, uniqueness beats beauty). Both functions below are the
 * durable format contract shared by the backend generator and the UI display;
 * do not inline the year padding at call sites.
 */

/** Clean a customer shortName into a code prefix ('' when unusable). */
export function shipmentCodePrefix(shortName: string): string {
  const noDiacritics = shortName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return noDiacritics
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

/** Full code: prefix + 2-digit year + zero-padded 3-digit sequence. */
export function buildShipmentCode(prefix: string, year: number, seq: number): string {
  return `${prefix}${String(year % 100).padStart(2, '0')}${String(seq).padStart(3, '0')}`;
}

/**
 * Anchored matcher for one customer+year; group 1 captures the numeric seq
 * tail. Mirrors buildShipmentCode so the backend max-seq scan and the builder
 * can never drift apart.
 */
export function shipmentCodeSeqRe(prefix: string, year: number): RegExp {
  return new RegExp(`^${prefix}${String(year % 100).padStart(2, '0')}(\\d{3,})$`);
}
