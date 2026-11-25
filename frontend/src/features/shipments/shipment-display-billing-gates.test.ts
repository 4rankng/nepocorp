import { describe, expect, it } from 'vitest';
import { Role } from '@tingting/shared';
import { canCreateBillingDocuments, canManageBillingDocuments, canSeeBillingDocuments } from './shipmentDisplay';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import detailPage from '../../pages/ShipmentDetailPage.tsx?raw';
import billingPanel from '../../components/billing/BillingDocumentsPanel.tsx?raw';

// vitest renders a `?raw` import of a .css file as '' — read the source from
// disk instead (same approach as pages/filter-grid-rebuild.styles.test.ts).
const PAGES_DIR = dirname(fileURLToPath(import.meta.url)) + '/../../pages';
const detailCss = readFileSync(resolve(PAGES_DIR, 'ShipmentDetailPage.css'), 'utf8');

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

  it('r4 — cost-register Trạng thái pill renders neutral for stripped roles (QA 14:47 residual)', () => {
    // QA verdict 14:47 24/11 on build 06b3737a: /shipments/4 still spelled
    // "CHƯA LÊN BÁO NỢ" on the cost rows for gncapture. The pill is now
    // rendered ONLY when the role sees billing data AND the server sent a
    // status (GET /:id/costs/register strips the debit-note state otherwise);
    // the fallback is the neutral dash — the pill vocabulary is never visible
    // to FORWARDER, while ketoan/admin keep the exact labels (3a unchanged).
    expect(detailPage).toContain('{canSeeBilling && row.status ? (');
    expect(detailPage).toContain('{LOT_FEE_STATUS_LABELS[row.status]}');
    // The cost form's "Chờ hóa đơn" hint must not spell 'Báo nợ' to stripped roles.
    expect(detailPage).toContain("{canSeeBilling ? 'in trên Báo nợ không có số tiền' : 'in không có số tiền'}");
  });

  it('r5 — lot cost register escapes the global 900px table floor (QA 25/11 overlap on Thông tin lô)', () => {
    // QA verdict 25/11 on build 23fccdcc @1440×900: the base `table` rule
    // (components/Table.css "Base table styles") carries min-width: 900px, so
    // the register tables rendered 900px inside a ~740px grid column and
    // painted the Trạng thái pills and row-action icons over the Thông tin lô
    // card (ETD cut in half, Cut-off/Hãng tàu/Cont-Seal hidden). The register
    // tables override the floor; narrow containers scroll via .table-scroll
    // instead of bleeding into the right rail.
    expect(detailCss).toMatch(/\.lot-register__table \{[^}]*min-width: 0;/);
    const wrappers = detailPage.match(/<div className="table-scroll">/g) ?? [];
    expect(wrappers.length).toBe(3);
  });
});
