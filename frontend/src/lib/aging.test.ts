import { describe, it, expect } from 'vitest';
import { normalizeAging, oldestAgingBucketIdx } from './aging';

/**
 * One overdue rule for every debt surface: money in a bucket past the current
 * 0–30 one. `> 0` from this helper is what the AR list, the AR detail badge and
 * the AR/AP aging notes all read (kanban 101026203130).
 */
describe('oldestAgingBucketIdx', () => {
  it('returns the OLDEST non-empty bucket, not the largest', () => {
    // NITODA live buckets: current 1,3 tỷ (largest) + 674 triệu in 31–60.
    expect(oldestAgingBucketIdx([1_309_764_425, 674_492_444, 0, 0])).toBe(1);
    // AN KHÁNH live buckets: current 164,7 triệu (largest) + 143,8 triệu in 31–60.
    expect(oldestAgingBucketIdx([164_700_004, 143_789_996, 0, 0])).toBe(1);
    // NAM PHONG: 31–60 is both the largest and the oldest.
    expect(oldestAgingBucketIdx([49_788_000, 90_608_000, 0, 0])).toBe(1);
    // Several overdue buckets open → the most severe wins.
    expect(oldestAgingBucketIdx([0, 15_040_000, 4_266_000, 21_501_600])).toBe(3);
  });

  it('stays in terms when only the current bucket carries money', () => {
    expect(oldestAgingBucketIdx([30_000, 0, 0, 0])).toBe(0);
    expect(oldestAgingBucketIdx([30_000, 0, 0, 0]) > 0).toBe(false);
  });

  it('is -1 when every bucket is empty (or credited)', () => {
    expect(oldestAgingBucketIdx([0, 0, 0, 0])).toBe(-1);
    expect(oldestAgingBucketIdx([-5_000, 0, 0, 0])).toBe(-1);
  });

  it('reads the same arrays the detail pages get from normalizeAging', () => {
    const amounts = normalizeAging([
      { range: '0-30', amount: 164_700_004 },
      { range: '31-60 ngày', amount: 143_789_996 },
    ]);
    expect(oldestAgingBucketIdx(amounts)).toBe(1);
  });
});

/**
 * Aging buckets must map by RANGE, never by array index: a carrier whose API
 * returns a short/reordered list was rendering its 31–60 balance under a
 * neighbouring label (kanban 091026010110 / 091026135140).
 */
describe('normalizeAging', () => {
  it('maps an ordered full list to the four display slots', () => {
    expect(normalizeAging([
      { range: '0-30', amount: 100 },
      { range: '31-60', amount: 200 },
      { range: '61-90', amount: 300 },
      { range: '90+', amount: 400 },
    ])).toEqual([100, 200, 300, 400]);
  });

  it('places a range by its label even when the list is short/reordered', () => {
    // The reported defect: only the 31–60 bucket is returned and it used to
    // land in slot 0 (unlabelled cell); it must land in slot 1.
    expect(normalizeAging([{ range: '31-60 ngày', amount: 234_684_000 }]))
      .toEqual([0, 234_684_000, 0, 0]);
    expect(normalizeAging([
      { range: 'Trên 90 ngày', amount: 5 },
      { range: '0-30', amount: 7 },
    ])).toEqual([7, 0, 0, 5]);
  });

  it('sums buckets that share a range and ignores unknown ranges', () => {
    expect(normalizeAging([
      { range: '0-30', amount: 10 },
      { range: '0 - 30', amount: 5 },
      { range: 'không rõ', amount: 999 },
    ])).toEqual([15, 0, 0, 0]);
  });

  it('returns zeroed slots for an empty list', () => {
    expect(normalizeAging([])).toEqual([0, 0, 0, 0]);
  });
});
