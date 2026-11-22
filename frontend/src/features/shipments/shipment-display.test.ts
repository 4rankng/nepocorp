/**
 * NEPO-61 pin — the profit strip rows of the lô detail.
 * Lợi nhuận lô = Tổng Thu (báo nợ incl. VAT) − Chi trả NCC − Chi chạy xe;
 * Thu khách is the informational split of the revenue, never an extra source.
 * Chi chạy xe rides a "Tự động từ chuyến liên quan" tooltip — no manual
 * booking surface exists for it.
 */
import { describe, expect, it } from 'vitest';
import { profitRows } from './shipmentDisplay';
import type { ShipmentProfitSummary } from '@tingting/shared';

const SAMPLE: ShipmentProfitSummary = {
  revenueInclVat: 100_000_000, // Doanh thu — Σ giấy báo nợ của lô
  collectTotal: 30_000_000,    // Thu khách — phần thu trực tiếp
  payTotal: 22_000_000,        // Chi trả NCC
  tripCosts: 18_000_000,       // Chi chạy xe (tự động từ chuyến)
  profit: 60_000_000,          // 100M − 22M − 18M
  linkedTripCount: 3,
  billingDocumentCount: 1,
};

describe('profitRows — lô profit strip (NEPO-61)', () => {
  it('renders exactly five rows in display order', () => {
    const rows = profitRows(SAMPLE);
    expect(rows.map((r) => r.key)).toEqual(['revenue', 'collect', 'pay', 'tripCosts', 'profit']);
    expect(rows).toHaveLength(5);
  });

  it('carries the pinned sample values (100M / 30M / 22M / 18M → 60M)', () => {
    const [revenue, collect, pay, tripCosts, profit] = profitRows(SAMPLE);
    expect(revenue.value).toBe(100_000_000);
    expect(collect.value).toBe(30_000_000);
    expect(pay.value).toBe(22_000_000);
    expect(tripCosts.value).toBe(18_000_000);
    expect(profit.value).toBe(60_000_000);
  });

  it('marks Chi chạy xe as auto-derived and colors profit by sign', () => {
    const [, , , tripCosts, profit] = profitRows(SAMPLE);
    expect(tripCosts.title).toBe('Tự động từ chuyến liên quan');
    expect(profit.valueClassName).toBe('is-positive');
  });

  it('negative profit flips to the negative class', () => {
    const loss = profitRows({ ...SAMPLE, profit: -5_000_000 });
    expect(loss.find((r) => r.key === 'profit')?.valueClassName).toBe('is-negative');
  });
});
