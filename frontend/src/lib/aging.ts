import type { AgingBucket } from '@tingting/shared';

/**
 * Canonical aging-bucket key, independent of the label the API happens to emit.
 */
type BucketKey = '0-30' | '31-60' | '61-90' | '90+';

const AGING_BUCKET_INDEX: Record<BucketKey, number> = {
  '0-30': 0,
  '31-60': 1,
  '61-90': 2,
  '90+': 3,
};

/**
 * Normalize a range string to a bucket key. Tolerates the forms the API emits
 * ("0-30", "31-60 ngày", "90+", "Trên 90 ngày"). Returns null when the string
 * matches no known bucket, so an unknown label never steals another bucket's
 * amount.
 */
function rangeKey(range: string | undefined): BucketKey | null {
  if (!range) return null;
  const raw = range.toLowerCase().replace(/ngày/g, '').trim();
  if (raw.includes('90') && !raw.includes('-')) return '90+'; // "90+", "trên 90"
  if (/^\d+\s*-\s*\d+$/.test(raw)) {
    const key = raw.replace(/\s+/g, '') as BucketKey;
    return key in AGING_BUCKET_INDEX ? key : null;
  }
  return null;
}

/**
 * Map the API's aging buckets onto the fixed 4-slot `[0–30, 31–60, 61–90, 90+]`
 * display order.
 *
 * Mapping is by each bucket's RANGE, never by array index: some endpoints emit a
 * short or reordered list, and index mapping then shifts every label — a
 * customer/carrier's real 31–60 balance renders under a neighbouring label and
 * its own cell looks unlabelled (kanban 091026010110 / 091026135140). Shared by
 * the AR (/debt) and AP (/payables) detail pages so the two never drift.
 */
export function normalizeAging(buckets: AgingBucket[]): number[] {
  const amounts = [0, 0, 0, 0];
  for (const b of buckets) {
    const key = rangeKey(b.range);
    if (key === null) continue;
    amounts[AGING_BUCKET_INDEX[key]] += b.amount;
  }
  return amounts;
}

/**
 * Index of the OLDEST bucket still carrying a balance (0–3), or -1 when the
 * customer/supplier owes nothing.
 *
 * `> 0` is the app's overdue rule — money sitting in 31–60 / 61–90 / over-90
 * rather than the current 0–30 bucket — and it is the SAME rule the list, the
 * detail header and the aging notes read. The detail surfaces used to take the
 * LARGEST bucket instead, so a customer with 1,3 tỷ current + 674 triệu overdue
 * had its detail say "Toàn bộ công nợ đang trong hạn 30 ngày" while the list
 * said "Nợ quá hạn" (kanban 101026203130).
 *
 * Overdue-by-bucket and the API's `maxOverdueDays > 30` agree by construction:
 * `maxOverdueDays` is the age of the oldest still-open invoice, and an invoice
 * older than 30 days is exactly what lands money outside the current bucket.
 */
export function oldestAgingBucketIdx(amounts: readonly number[]): number {
  for (let i = amounts.length - 1; i >= 0; i--) {
    if (amounts[i] > 0) return i;
  }
  return -1;
}
