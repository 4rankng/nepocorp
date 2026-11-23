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

/** Legal-entity filler words that carry no identity ("Công ty TNHH", "Cổ phần",
 *  "Trách nhiệm hữu hạn", "Một thành viên" — full spellings included). */
const GENERIC_NAME_TOKENS: Record<string, true> = {
  CONG: true, TY: true, CTY: true, TNHH: true, MTV: true, CO: true, CP: true,
  PHAN: true, TRACH: true, NHIEM: true, HUU: true, HAN: true,
  MOT: true, THANH: true, VIEN: true,
};

function normalizeNameTokens(name: string): string[] {
  const noDiacritics = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  return noDiacritics
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);
}

/**
 * Derive a usable Mã KH (2–6 chars) from the customer's legal name: drop
 * generic legal-entity tokens, join the rest, cap at 6. Falls back to all
 * tokens (when every word is generic, e.g. "Công ty TNHH") and then to word
 * initials. Returns '' when the name yields nothing usable at all.
 */
export function deriveShipmentCodeShortName(name: string): string {
  const tokens = normalizeNameTokens(name);
  if (tokens.length === 0) return '';
  const meaningful = tokens.filter(t => GENERIC_NAME_TOKENS[t] !== true);
  const fromMeaningful = meaningful.join('').slice(0, 6);
  if (fromMeaningful.length >= 2) return fromMeaningful;
  const fromAll = tokens.join('').slice(0, 6);
  if (fromAll.length >= 2) return fromAll;
  const initials = tokens.map(t => t[0]).join('').slice(0, 6);
  return initials.length >= 2 ? initials : '';
}

/**
 * Anchored matcher for one customer+year; group 1 captures the numeric seq
 * tail. Mirrors buildShipmentCode so the backend max-seq scan and the builder
 * can never drift apart.
 */
export function shipmentCodeSeqRe(prefix: string, year: number): RegExp {
  return new RegExp(`^${prefix}${String(year % 100).padStart(2, '0')}(\\d{3,})$`);
}
