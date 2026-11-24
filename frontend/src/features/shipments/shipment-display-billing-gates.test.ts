import { describe, expect, it } from 'vitest';
import { Role } from '@tingting/shared';
import { canCreateBillingDocuments, canManageBillingDocuments, canSeeBillingDocuments } from './shipmentDisplay';
import detailPage from '../../pages/ShipmentDetailPage.tsx?raw';
import billingPanel from '../../components/billing/BillingDocumentsPanel.tsx?raw';

// NEPO-63 role matrix (docs/flows/16-LO_HANG.md §7 = yêu cầu §6): Giấy báo nợ —
// Kế toán "tạo + chốt", Ops biển (FORWARDER) chỉ xem lô, Admin sửa bản đã phát
// hành (có audit log). The UI gates mirror requireRoles(...) on
// /api/finance/billing-documents*: POST save/generate/issue/supplement →
// ADMIN/MANAGER/ACCOUNTANT; PUT/DELETE :id → ADMIN-only. Before NEPO-63 the
// buttons hung off the lô-write gate instead: ketoan couldn't see a POST the
// API allowed, Ops biển saw buttons the API answers 403.
describe('billing-document role gates — UI mirrors the billing-documents API policy', () => {
  it('canCreateBillingDocuments covers exactly ADMIN/MANAGER/ACCOUNTANT (tạo + chốt)', () => {
    expect(canCreateBillingDocuments(Role.ADMIN)).toBe(true);
    expect(canCreateBillingDocuments(Role.MANAGER)).toBe(true);
    expect(canCreateBillingDocuments(Role.ACCOUNTANT)).toBe(true);
    expect(canCreateBillingDocuments(Role.FORWARDER)).toBe(false);
    expect(canCreateBillingDocuments(Role.DISPATCHER)).toBe(false);
    expect(canCreateBillingDocuments(Role.DRIVER)).toBe(false);
    expect(canCreateBillingDocuments(null)).toBe(false);
    expect(canCreateBillingDocuments(undefined)).toBe(false);
  });

  it('canManageBillingDocuments is ADMIN-only (sửa Báo nợ đã phát hành + xóa nháp)', () => {
    expect(canManageBillingDocuments(Role.ADMIN)).toBe(true);
    expect(canManageBillingDocuments(Role.MANAGER)).toBe(false);
    expect(canManageBillingDocuments(Role.ACCOUNTANT)).toBe(false);
    expect(canManageBillingDocuments(Role.FORWARDER)).toBe(false);
  });

  it('lô detail debit-note buttons follow the billing-doc gates, not the lô-write gate', () => {
    // Lập Báo nợ lô — ketoan must see it (was hidden behind canWriteShipments).
    expect(detailPage).toContain('const canIssueDebitNote = canCreateBillingDocuments(user?.role);');
    expect(detailPage).toContain('canIssueDebitNote && !mainNote');
    // Phát hành (chốt) + Bổ sung -BS01 — POST issue/supplement role set.
    expect(detailPage).toContain('!doc.issuedAt && canIssueDebitNote &&');
    expect(detailPage).toContain('doc.issuedAt && doc.parentDocumentId == null && canIssueDebitNote');
    // Xóa Báo nợ chưa phát hành — ADMIN-only DELETE.
    expect(detailPage).toContain('!doc.issuedAt && canManageBillingDocuments(user?.role)');
    // Lô edit/cost/chứng từ stay on the lô-write gate (FORWARDER tạo/sửa lô).
    expect(detailPage).toContain('canWriteShipments(user?.role)');
  });

  it('Sửa Báo nợ đã phát hành — ADMIN-only pencil on issued rows opens the shared builder', () => {
    // NEPO-63 r2 — QA blocker 24/11 12:47: the PUT had zero UI call sites on
    // the lô page; issued rows showed only Bổ sung -BS01 + Xuất Excel. The
    // pencil now sits ONLY on issued rows behind canManageBillingDocuments
    // (ketoan/gncapture never see it), fetches the full document (the row
    // summary has no lines), and mounts the builder whose save path is
    // financialClient.updateBillingDocument → PUT /finance/billing-documents/:id
    // (server requireRoles(Role.ADMIN) + DEBIT_NOTE_UPDATED audit entry).
    expect(detailPage).toContain('doc.issuedAt && canManageBillingDocuments(user?.role)');
    expect(detailPage).toContain('title="Sửa Báo nợ đã phát hành (ghi nhật ký)"');
    expect(detailPage).toContain('financialClient.getBillingDocument(doc.id)');
    expect(detailPage).toContain('<BillingDocumentBuilder');
    expect(detailPage).toContain('initialDoc={editNoteDoc}');
  });

  it('billing panel create/builder gates follow the same POST policy', () => {
    expect(billingPanel).toContain('canCreateBillingDocuments(user?.role)');
    expect(billingPanel).toContain('builderOpen && canCreateBillingDocuments(user?.role)');
  });

  it('canSeeBillingDocuments mirrors the server-stripped embed (QA 3b: gncapture sees no Báo nợ)', () => {
    expect(canSeeBillingDocuments(Role.ADMIN)).toBe(true);
    expect(canSeeBillingDocuments(Role.MANAGER)).toBe(true);
    expect(canSeeBillingDocuments(Role.ACCOUNTANT)).toBe(true);
    expect(canSeeBillingDocuments(Role.FORWARDER)).toBe(false);
    expect(canSeeBillingDocuments(Role.DISPATCHER)).toBe(false);
    expect(canSeeBillingDocuments(Role.DRIVER)).toBe(false);
    expect(canSeeBillingDocuments(null)).toBe(false);
    expect(canSeeBillingDocuments(undefined)).toBe(false);
  });

  it('lô detail hides the WHOLE Giấy báo nợ theo lô section for stripped roles', () => {
    // NEPO-63 QA 3b fail (build eb668fd): the section (danh sách DN + dòng
    // -BS01 + Xuất Excel + chú thích) still rendered for FORWARDER even though
    // every button was gated. The entire section now sits behind the
    // visibility gate matching the server-side strip in GET /api/shipments/:id.
    expect(detailPage).toContain('const canSeeBilling = canSeeBillingDocuments(user?.role);');
    expect(detailPage).toContain('{canSeeBilling && (<section className="shipment-detail__card">');
    expect(detailPage).toContain('<h2 className="shipment-detail__card-title">Giấy báo nợ theo lô</h2>');
  });
});
