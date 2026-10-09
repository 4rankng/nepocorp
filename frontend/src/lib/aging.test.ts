import { describe, it, expect } from 'vitest';
import { normalizeAging } from './aging';

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
