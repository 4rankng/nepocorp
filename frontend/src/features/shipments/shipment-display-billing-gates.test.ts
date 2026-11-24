import { describe, expect, it } from 'vitest';
import { Role } from '@tingting/shared';
import { canCreateBillingDocuments, canManageBillingDocuments } from './shipmentDisplay';
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

  it('billing panel create/builder gates follow the same POST policy', () => {
    expect(billingPanel).toContain('canCreateBillingDocuments(user?.role)');
    expect(billingPanel).toContain('builderOpen && canCreateBillingDocuments(user?.role)');
  });
});
