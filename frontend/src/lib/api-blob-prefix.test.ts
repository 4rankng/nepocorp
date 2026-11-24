import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

// NEPO-62 regression — the Giấy báo nợ + SOA "Xuất Excel" buttons once fetched
// `/finance/...` and `/ledger/...` paths without the /api prefix, so the SPA
// answered with its own index.html (2.4 KB) renamed .xlsx while the real
// endpoints `/api/finance/billing-documents/:id/export` and
// `/api/ledger/customers/soa/export` return the actual workbooks. api.getBlob
// owns the /api prefix + auth header; these pins keep it that way.
describe('api blob downloads — /api prefix (NEPO-62 export regression)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('api.getBlob prefixes the /api base onto billing-document export paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['xlsx']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await api.getBlob('/finance/billing-documents/35/export');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/finance/billing-documents/35/export');
  });

  it('api.getBlob prefixes the /api base onto SOA ledger export paths', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(['xlsx']), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await api.getBlob('/ledger/customers/soa/export?from=2026-11-01&to=2026-11-30');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/ledger/customers/soa/export?from=2026-11-01&to=2026-11-30');
  });
});
