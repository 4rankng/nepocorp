import { describe, expect, it } from 'vitest';
import { PAGE_CATALOG } from '@tingting/shared';
import { titleForPath } from './routes';

/**
 * NEPO-3 — the page title (topbar, breadcrumb sources, agent search) comes
 * from PAGE_CATALOG via this projection; pin the renamed title and the
 * untouched /trips entry.
 */
describe('page title — Bảng tổng hợp số liệu (NEPO-3)', () => {
  it('titleForPath resolves /bang-ke-hoach to the new name', () => {
    expect(titleForPath('/bang-ke-hoach')).toBe('Bảng tổng hợp số liệu');
  });

  it('catalog entry keeps the path but renames title + description', () => {
    expect(PAGE_CATALOG.bangKeHoach.title).toBe('Bảng tổng hợp số liệu');
    expect(PAGE_CATALOG.bangKeHoach.path).toBe('/bang-ke-hoach');
    expect(PAGE_CATALOG.bangKeHoach.agent?.description).toContain('Bảng tổng hợp số liệu');
    expect(PAGE_CATALOG.bangKeHoach.agent?.description).not.toContain('Bảng kế hoạch');
  });

  it('trips catalog entry stays "Lệnh vận chuyển" (màn /trips — không đổi)', () => {
    expect(PAGE_CATALOG.trips.title).toBe('Lệnh vận chuyển');
    expect(titleForPath('/trips')).toBe('Lệnh vận chuyển');
  });
});
