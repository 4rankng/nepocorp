import { describe, expect, it } from 'vitest';
import { buildDailySeries } from './utils';

const trip = (departureDate: string, revenue: number, grossProfit: number, status = 'COMPLETED') => ({
  departureDate,
  status,
  revenue,
  grossProfit,
});

describe('buildDailySeries — the daily chart x-axis', () => {
  it('plots revenue on the display basis, matching the gross line (kanban 101026230100)', () => {
    // Contract 10.800.000 at 8% VAT, commission 200.000: the chart must plot
    // 10.800.000/1.08 − 200.000 = 9.800.000 (chưa VAT), not the raw contract.
    const series = buildDailySeries([{
      departureDate: '2026-10-05',
      status: 'COMPLETED',
      revenue: 10_800_000,
      grossProfit: 2_400_000,
      vatRate: 0.08,
      customerCommission: 200_000,
    }]);
    expect(series[0].revenue).toBe(9_800_000);
  });

  it('keeps a zero point for a day with no trip so the axis has no hole', () => {
    // The reported shape: trips on 1…9 and 11, nothing on the 10th.
    const trips = [
      ...Array.from({ length: 9 }, (_, i) => trip(`2026-10-0${i + 1}`, 1_000_000, 200_000)),
      trip('2026-10-11', 3_000_000, 800_000),
    ];

    const series = buildDailySeries(trips);

    expect(series.map((point) => point.day)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    // NEPO-26: the gap day carries hasData=false so the chart gaps it
    // instead of plotting a 0 that reads as a crash.
    expect(series[9]).toEqual({ day: 10, revenue: 0, gross: 0, hasData: false });
    expect(series[8]).toMatchObject({ hasData: true });
    expect(series[10]).toMatchObject({ hasData: true });
    // NEPO-26: a day whose trips are all unbilled (display revenue 0, gross
    // ≤ 0 — demo 22/10) gaps out too, it must not read as a crash to 0.
    const withUnbilled = buildDailySeries([...trips, trip('2026-10-10', 0, -2_000_000)]);
    expect(withUnbilled[9]).toEqual({ day: 10, revenue: 0, gross: -2_000_000, hasData: false });
    // The days around the gap keep their own figures.
    expect(series[8].revenue).toBe(1_000_000);
    expect(series[10].revenue).toBe(3_000_000);
  });

  it('sums every trip of the same day into one point', () => {
    const series = buildDailySeries([
      trip('2026-10-05', 1_500_000, 100_000),
      trip('2026-10-05', 2_500_000, 400_000),
    ]);

    expect(series).toEqual([{ day: 5, revenue: 4_000_000, gross: 500_000, hasData: true }]);
  });

  it('reads money fields that arrive as strings, the shape the API sends', () => {
    const series = buildDailySeries([
      { departureDate: '2026-10-02', status: 'COMPLETED', revenue: '10800000', grossProfit: '2480000' },
    ]);

    expect(series).toEqual([{ day: 2, revenue: 10_800_000, gross: 2_480_000, hasData: true }]);
  });

  it('trims empty days at both edges instead of charting the whole month', () => {
    const series = buildDailySeries([
      trip('2026-10-03', 1_000_000, 0),
      trip('2026-10-06', 0, 500_000),
    ]);

    expect(series.map((point) => point.day)).toEqual([3, 4, 5, 6]);
  });

  it('crosses a month boundary day by day when the period straddles two months', () => {
    // useMonthlyTrips charts the salary period, which can start in the
    // previous month (e.g. 26/09 → 25/10).
    const series = buildDailySeries([
      trip('2026-09-29', 1_000_000, 0),
      trip('2026-10-02', 1_000_000, 0),
    ]);

    expect(series).toHaveLength(4);
    expect(series.map((point) => point.day)).toEqual([29, 30, 1, 2]);
  });

  it('ignores cancelled trips, unparsable dates and days with no money', () => {
    const series = buildDailySeries([
      trip('2026-10-07', 9_000_000, 9_000_000, 'CANCELED'),
      trip('2026-10', 9_000_000, 9_000_000),
      { departureDate: null, status: 'COMPLETED', revenue: 9_000_000, grossProfit: 0 },
      trip('2026-10-08', 0, 0),
    ]);

    expect(series).toEqual([]);
  });
});
