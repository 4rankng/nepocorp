/**
 * NEPO-61 nav pins — the Lô hàng entry.
 * FORWARDER's ops-biển lane and the office array both carry the module; the
 * office entry sits right after Kế hoạch vận chuyển so operations stay
 * ordered. Labels are pinned: nav renames break dashboards + deep links.
 */
import { describe, expect, it } from 'vitest';
import { Role } from '@tingting/shared';
import { getNavItems } from './Layout';

const OFFICE_ROLES = [Role.MANAGER, Role.ACCOUNTANT, Role.ADMIN];

describe('nav pins — Lô hàng (NEPO-61)', () => {
  it('FORWARDER nav owns the Lô hàng entry', () => {
    const item = getNavItems(Role.FORWARDER).find((i) => i.key === 'shipments');
    expect(item, 'FORWARDER nav has no Lô hàng entry').toBeTruthy();
    expect(item?.label).toBe('Lô hàng');
    expect(item?.path).toBe('/shipments');
  });

  it('office nav includes Lô hàng right after Kế hoạch vận chuyển', () => {
    for (const role of OFFICE_ROLES) {
      const items = getNavItems(role);
      const tripsIdx = items.findIndex((i) => i.key === 'trips');
      const shipmentsIdx = items.findIndex((i) => i.key === 'shipments');
      expect(shipmentsIdx, `${role} nav has no Lô hàng entry`).toBeGreaterThan(-1);
      expect(shipmentsIdx).toBe(tripsIdx + 1);
      expect(items[shipmentsIdx].label).toBe('Lô hàng');
      expect(items[shipmentsIdx].path).toBe('/shipments');
    }
  });

  it('driver nav has no Lô hàng entry', () => {
    expect(getNavItems(Role.DRIVER).some((i) => i.key === 'shipments')).toBe(false);
  });
});
