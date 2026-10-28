import { describe, expect, it } from 'vitest';
import { Role } from '@tingting/shared';
import { getNavItems } from './Layout';

/** NEPO-3 — nav label pins: màn hình đổi tên, /trips giữ nguyên. */
describe('nav labels — Bảng số liệu rename (NEPO-3)', () => {
  const officeRoles: Array<{ role: Role; label: string }> = [
    { role: Role.MANAGER, label: 'MANAGER' },
    { role: Role.ACCOUNTANT, label: 'ACCOUNTANT' },
    { role: Role.ADMIN, label: 'ADMIN' },
  ];

  for (const { role, label } of officeRoles) {
    it(`${label} nav shows the item as "Bảng số liệu" under the unchanged key`, () => {
      const items = getNavItems(role);
      const item = items.find((i) => i.key === 'ledger');
      expect(item?.label).toBe('Bảng số liệu');
      expect(item?.path).toBe('/ledger');
    });

    it(`${label} nav carries no stale "Bảng kế hoạch" label`, () => {
      const items = getNavItems(role);
      expect(items.some((i) => i.label === 'Bảng kế hoạch')).toBe(false);
    });
  }

  it('trips nav keeps its own "Kế hoạch vận chuyển" label (màn /trips — không đổi)', () => {
    for (const { role } of officeRoles) {
      const trips = getNavItems(role).find((i) => i.key === 'trips');
      expect(trips?.label).toBe('Kế hoạch vận chuyển');
    }
  });

  /** Pete 24/10: kế toán không thấy Điều vận và Người dùng; MANAGER/ADMIN giữ. */
  it('ACCOUNTANT nav has neither "Điều vận" nor "Người dùng"; MANAGER and ADMIN keep both', () => {
    const acc = getNavItems(Role.ACCOUNTANT);
    expect(acc.some((i) => i.key === 'dispatch')).toBe(false);
    expect(acc.some((i) => i.key === 'users')).toBe(false);
    for (const role of [Role.MANAGER, Role.ADMIN]) {
      const items = getNavItems(role);
      expect(items.find((i) => i.key === 'dispatch')?.label).toBe('Điều vận');
      expect(items.find((i) => i.key === 'users')?.label).toBe('Người dùng');
    }
  });

  /** NEPO-34: "Nhật ký OCR" là admin-only — nav layer của hợp đồng 3 lớp. */
  it('OCR log nav item appears for ADMIN only', () => {
    const adminItem = getNavItems(Role.ADMIN).find((i) => i.key === 'ocr-requests');
    expect(adminItem?.label).toBe('Nhật ký OCR');
    expect(adminItem?.path).toBe('/ocr-requests');
    for (const role of [Role.MANAGER, Role.ACCOUNTANT, Role.DRIVER, Role.FORWARDER]) {
      expect(getNavItems(role).some((i) => i.key === 'ocr-requests')).toBe(false);
    }
  });
});
