// NEPO-61 — mã lô hàng contract pins for the trips list surface: the lô
// column exists in view mode only, its grid track/class/export header stay
// in sync, and the ≤1023px collapse keeps hiding it (mobile cards carry the
// sub-line instead). Mirrors the raw-CSS pin style of
// src/pages/trips-header-layout.test.ts.
import tableCss from '../../pages/trip-list/table.css?raw';
import responsiveCss from '../../pages/trip-list/responsive.css?raw';
import { describe, expect, it } from 'vitest';
import { buildTripColumns, type TripQuickEditOptions } from './tripColumns';
import { columnClass } from '../../pages/trip-list-helpers';
import { TRIP_LIST_EXPORT_HEADERS } from './tripListExport';

// Tách rule body theo '}' — file CSS không lồng ngoài @media.
function rules(css: string): Array<{ selector: string; body: string }> {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').split('}').flatMap((chunk) => {
    const at = chunk.lastIndexOf('{');
    if (at === -1) return [];
    return [{ selector: chunk.slice(0, at).trim(), body: chunk.slice(at + 1) }];
  });
}

describe('trips lô column contract (NEPO-61)', () => {
  it('view mode has a MÃ LÔ HÀNG column after customer; quick-edit drops it', () => {
    const columns = buildTripColumns(37);
    const shipmentIdx = columns.findIndex((c) => c.id === 'shipment');
    const customerIdx = columns.findIndex((c) => c.id === 'customer');
    expect(customerIdx).toBeGreaterThan(-1);
    expect(shipmentIdx).toBe(customerIdx + 1);
    expect(columns[shipmentIdx].header).toBe('MÃ LÔ HÀNG');

    const quickEdit = { enabled: true } as unknown as TripQuickEditOptions;
    expect(buildTripColumns(37, quickEdit).some((c) => c.id === 'shipment')).toBe(false);
  });

  it('columnClass maps shipment → col-shipment', () => {
    expect(columnClass('shipment')).toBe('col-shipment');
  });

  it('export keeps the money columns pinned and appends MÃ LÔ HÀNG before Trạng thái', () => {
    // Index pins from tripListExport.test.ts / TripListPage.test.tsx must not
    // shift: the lô column rides after LN gộp, before the status column.
    expect(TRIP_LIST_EXPORT_HEADERS[11]).toBe('Tổng tiền đi đường lái xe nhận');
    expect(TRIP_LIST_EXPORT_HEADERS.slice(12, 16)).toEqual([
      'Doanh thu (chưa VAT)', 'Thuế VAT đầu ra', 'Doanh thu (gồm VAT)', 'Tổng chi phí',
    ]);
    const shipmentIdx = TRIP_LIST_EXPORT_HEADERS.indexOf('MÃ LÔ HÀNG');
    expect(shipmentIdx).toBe(TRIP_LIST_EXPORT_HEADERS.length - 2);
    expect(TRIP_LIST_EXPORT_HEADERS[shipmentIdx + 1]).toBe('Trạng thái');
  });

  it('view grid carries the shipment track in both head and row (118px budget)', () => {
    const track = 'minmax(96px, 118px)';
    const head = rules(tableCss).filter((r) => r.selector.includes('.table-head')
      && !r.selector.includes('quick-edit-mode')
      && r.body.includes('grid-template-columns'));
    const row = rules(tableCss).filter((r) => r.selector.includes('.table-row')
      && !r.selector.includes('quick-edit-mode')
      && r.body.includes('grid-template-columns'));
    expect(head.length).toBeGreaterThan(0);
    expect(row.length).toBeGreaterThan(0);
    for (const r of [...head, ...row]) {
      expect(r.body, `shipment track missing in ${r.selector}`).toContain(track);
    }
    // Khách/tuyến nhường theo tỉ lệ min gốc để tổng vẫn ~1130px (audit 23/10).
    for (const r of [...head, ...row]) {
      expect(r.body).toContain('minmax(131px, 1.1fr)');
      expect(r.body).toContain('minmax(145px, 1.2fr)');
    }
  });

  it('≤1023px collapse hides col-shipment with container/road/total-cost', () => {
    // Inside a multi-rule @media block the inner selectors do not carry the
    // media prefix, so slice the block out first, then assert the hide rule.
    const start = responsiveCss.indexOf('(max-width: 1023px)');
    expect(start, '≤1023px media block missing').toBeGreaterThan(-1);
    const end = responsiveCss.indexOf('@media', start + 1);
    const block = responsiveCss.slice(start, end === -1 ? responsiveCss.length : end);
    const hidden = rules(block).find((r) => r.selector.includes('.col-shipment'));
    expect(hidden, 'col-shipment display:none rule ≤1023px missing').toBeTruthy();
    expect(hidden!.body).toMatch(/display:\s*none/);
  });
});
