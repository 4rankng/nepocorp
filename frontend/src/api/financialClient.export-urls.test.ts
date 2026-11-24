import { describe, expect, it } from 'vitest';
import soaPage from '../pages/SoaPage.tsx?raw';
import billingPanel from '../components/billing/BillingDocumentsPanel.tsx?raw';
import billingBuilder from '../components/billing/BillingDocumentBuilder.tsx?raw';
import shipmentDetail from '../pages/ShipmentDetailPage.tsx?raw';
import { financialClient } from './financialClient';

// NEPO-62 regression — these Xuất Excel surfaces once built raw downloads of
// `/finance/...` and `/ledger/...` URLs: the dev server answered with the SPA's
// index.html renamed .xlsx while the real `/api/...` endpoints return the
// actual workbooks. Contract: the URL builders stay relative (api.getBlob owns
// the /api prefix) and every consumer downloads through api.getBlob.
describe('billing-document + SOA export URLs (NEPO-62 regression pins)', () => {
  it('export URL builders return relative API paths without a /api prefix', () => {
    expect(financialClient.getBillingDocumentExportUrl(35)).toBe('/finance/billing-documents/35/export');
    expect(financialClient.getBillingDocumentExportUrl(35, 7)).toBe('/finance/billing-documents/35/export?templateId=7');
    expect(financialClient.getCustomerSoaExportUrl('2026-11-01', '2026-11-30')).toBe(
      '/ledger/customers/soa/export?from=2026-11-01&to=2026-11-30',
    );
  });

  it('every export consumer downloads through api.getBlob (prefix + auth header)', () => {
    expect(billingPanel).toContain('api.getBlob(financialClient.getBillingDocumentExportUrl(');
    expect(billingBuilder).toContain('api.getBlob(financialClient.getBillingDocumentExportUrl(');
    expect(shipmentDetail).toContain('api.getBlob(financialClient.getBillingDocumentExportUrl(');
    expect(soaPage).toContain('api.getBlob(financialClient.getCustomerSoaExportUrl(');
  });

  it('no export consumer falls back to a raw fetch of an export path', () => {
    for (const source of [billingPanel, billingBuilder, shipmentDetail, soaPage]) {
      expect(source).not.toMatch(/fetch\(`?\/(finance|ledger)\//);
    }
  });
});
