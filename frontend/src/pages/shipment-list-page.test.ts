/**
 * NEPO-61 list-page pins — the write-role gate + layout contract.
 *
 * The Sửa (edit) column is gated to SHIPMENT_WRITE_ROLES — kế toán reads
 * lô but never writes (the backend mirrors the same gate with 403). Layout
 * law (ADR 0045): mobile card list ≤640px / desktop table >640px; mã lô in
 * JetBrains mono.
 */
import { describe, expect, it } from 'vitest';
import { Role } from '@tingting/shared';
import pageCss from './ShipmentListPage.css?raw';
import { canWriteShipments, cutoffUrgentCount } from './ShipmentListPage';
import { cutoffDaysLeft, isCutoffUrgent } from '../features/shipments/shipmentDisplay';

describe('shipment list — write-role gate (NEPO-61)', () => {
  it('write roles cover ADMIN/MANAGER/FORWARDER only', () => {
    expect(canWriteShipments(Role.ADMIN)).toBe(true);
    expect(canWriteShipments(Role.MANAGER)).toBe(true);
    expect(canWriteShipments(Role.FORWARDER)).toBe(true);
    // Kế toán and drivers read-only — no Sửa button, no upload zone.
    expect(canWriteShipments(Role.ACCOUNTANT)).toBe(false);
    expect(canWriteShipments(Role.DRIVER)).toBe(false);
    expect(canWriteShipments(null)).toBe(false);
    expect(canWriteShipments(undefined)).toBe(false);
  });
});

describe('shipment list — band counts', () => {
  it('counts only lô inside the cut-off warn window (page-honest)', () => {
    const within = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    const rows = [
      { cutoffDate: within(2) },
      { cutoffDate: within(3) },
      { cutoffDate: within(9) },
      { cutoffDate: null },
    ] as Array<{ cutoffDate: string | null }>;
    expect(cutoffUrgentCount(rows as never)).toBe(2);
  });

  it('cut-off urgency covers the warn window and the already-passed', () => {
    expect(cutoffDaysLeft('2026-11-26', new Date('2026-11-23'))).toBe(3);
    expect(cutoffDaysLeft(null, new Date('2026-11-23'))).toBeNull();
    expect(isCutoffUrgent('2026-11-26', new Date('2026-11-23'))).toBe(true); // ≤ 3 days
    expect(isCutoffUrgent('2026-11-20', new Date('2026-11-23'))).toBe(true); // passed, lô still open
    expect(isCutoffUrgent('2026-12-01', new Date('2026-11-23'))).toBe(false);
    expect(isCutoffUrgent(null, new Date('2026-11-23'))).toBe(false);
  });
});

/** Same body-splitting helper as the trips-header-layout pin. */
function cssRules(css: string): Array<{ selector: string; body: string }> {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('}')
    .flatMap((chunk) => {
      const at = chunk.lastIndexOf('{');
      if (at === -1) return [];
      return [{ selector: chunk.slice(0, at).trim(), body: chunk.slice(at + 1) }];
    });
}

describe('shipment list — layout law (ADR 0045)', () => {
  it('mobile card list and desktop table split at 640px', () => {
    expect(pageCss).toMatch(/@media \(max-width: 640px\)/);
  });

  it('mã lô cell uses the mono font (codes never animate, never truncate)', () => {
    const rule = cssRules(pageCss).find((r) => r.selector.endsWith('.shipment-list-table__code'));
    expect(rule, 'code cell rule missing').toBeTruthy();
    expect(rule!.body).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(rule!.body).toMatch(/font-variant-numeric:\s*tabular-nums/);
  });

  it('money band is a flat bordered surface — no shadows', () => {
    const rule = cssRules(pageCss).find((r) => r.selector === '.shipment-band');
    expect(rule, 'band rule missing').toBeTruthy();
    expect(rule!.body).toMatch(/border:\s*1px solid var\(--line\)/);
    expect(rule!.body).not.toMatch(/box-shadow/);
  });
});
