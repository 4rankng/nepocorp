import { describe, expect, it } from 'vitest';
import { BRAND } from './brand';

describe('TTransport brand contract', () => {
  it('uses the approved Vietnamese identity copy', () => {
    expect(BRAND).toEqual({
      name: 'TTransport',
      productName: 'TTransport Logistics',
      tagline: 'Vận tải thông minh. Doanh nghiệp vững mạnh.',
      shellDescriptor: 'Quản lý vận tải và logistics',
      logoPath: '/assets/ttransport-logo-192.png?v=4',
      sidebarLogoPath: '/assets/ttransport-sidebar-mark-192.png?v=4',
    });
  });
});
