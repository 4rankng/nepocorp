/**
 * Lô hàng — shipment detail (NEPO-61) + Bảng chi phí theo lô + Giấy báo nợ
 * theo lô (NEPO-62).
 *
 * Left column: the lot cost register — six fee groups (rows carry direction
 * Thu khách / Trả NCC, mode Dịch vụ / Nộp hộ, VND/USD + tỷ giá, VAT, status
 * Chưa lên Báo nợ / Đã lên / Chờ hóa đơn) plus the read-only truck-transfer
 * section fed by the linked trips' own figures (dầu / lương / vé cầu đường /
 * cước thuê xe ngoài — sea freight and customs fees never book there).
 * Right column: Thông tin lô, chuyến liên quan, chứng từ, and the per-lot
 * debit-note chain: 1 lô = 1 Báo nợ chính + bổ sung -BS01; phát hành freezes
 * the note and Chờ hóa đơn rows print amount-less, outside the total.
 */
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Download, FileText, PencilLine, Plus, Receipt, Send, Trash2 } from 'lucide-react';
import {
  FeeGroup,
  FEE_GROUP_LABELS,
  LOT_FEE_STATUS_LABELS,
  SHIPMENT_DOC_TYPE_LABELS,
  ShipmentDocType,
} from '@tingting/shared';
import type {
  BillingDocument,
  BillingDraftLine,
  LotCostRow,
  LotFeeStatus,
  SaveBillingDocumentInput,
  ShipmentBillingDocSummary,
  ShipmentCost,
  ShipmentDetail,
} from '@tingting/shared';
import { useAuth } from '../hooks/useAuth';
import {
  useAddShipmentCost,
  useDeleteShipmentCost,
  useDeleteShipmentDocument,
  useShipmentCostRegister,
  useShipmentDetail,
  useUpdateShipmentCost,
  useUploadShipmentDocument,
} from '../hooks/useShipmentQueries';
import { shipmentClient } from '../api/shipmentClient';
import { financialClient } from '../api/financialClient';
import { api } from '../lib/api';
import ShipmentFormModal from '../features/shipments/ShipmentFormModal';
import BillingDocumentBuilder from '../components/billing/BillingDocumentBuilder';
import { downloadBlob } from '../lib/download';
import { formatCurrency, formatDate } from '../lib/format';
import { qk } from '../api/keys';
import { PageHeader, StatusPill } from '../components/UI';
import type { PillVariant } from '../components/UI';
import { Modal } from '../components/UI';
import { useConfirm } from '../components/useConfirm';
import { useToast } from '../components/shared/Toast';
import { Breadcrumbs } from '../components/shared/Breadcrumbs';
import {
  canWriteShipments,
  canEditShipmentCosts,
  canCreateBillingDocuments,
  canManageBillingDocuments,
  canSeeBillingDocuments,
  cutoffDaysLeft,
  flowTypeLabel,
  formatFileSize,
  isCutoffUrgent,
  profitRows,
  routeText,
  tripStatusLabel,
} from '../features/shipments/shipmentDisplay';
// The profit strip reuses the .shipment-band__* (and crumbs) class names
// defined in ShipmentListPage.css. Pages are lazy chunks: without this import
// the detail chunk ships no band styles and label/amount render glued at 0px.
import './ShipmentListPage.css';
import './ShipmentDetailPage.css';

const FEE_GROUP_OPTIONS = Object.values(FeeGroup) as FeeGroup[];

const FEE_STATUS_VARIANT: Record<LotFeeStatus, PillVariant> = {
  PENDING: 'neutral',
  ON_DEBIT_NOTE: 'success',
  AWAITING_INVOICE: 'warn',
};

const EMPTY_COST_FORM = {
  costType: FeeGroup.OTHER as FeeGroup,
  direction: 'SUPPLIER' as 'CUSTOMER' | 'SUPPLIER',
  serviceMode: 'SERVICE' as 'SERVICE' | 'ADVANCE',
  description: '',
  currency: 'VND' as 'VND' | 'USD',
  fxAmount: '',
  exchangeRate: '',
  amount: '',
  vatRate: '0.08',
  awaitingInvoice: false,
  incurredDate: new Date().toISOString().slice(0, 10),
  note: '',
};

type CostForm = typeof EMPTY_COST_FORM;

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const shipmentId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast: showToast } = useToast();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // NEPO-61 — the list row's pencil lands here with ?edit=1: open the form
  // modal immediately, and strip the flag on close so a reload stays read-only.
  const [searchParams, setSearchParams] = useSearchParams();
  const [editOpen, setEditOpen] = useState(() => searchParams.get('edit') === '1');

  const canWrite = canWriteShipments(user?.role);
  // Spec §7 — kế toán sửa được dòng chi phí đã có (edit-only, không tạo/xóa).
  const canEditCosts = canEditShipmentCosts(user?.role);
  // NEPO-63 — the debit-note button follows the billing-documents server
  // policy, NOT the lô-write policy: ketoan sees it, forwarder does not.
  const canIssueDebitNote = canCreateBillingDocuments(user?.role);
  // NEPO-63 (QA 3b) — the whole 'Giấy báo nợ theo lô' section is hidden for
  // roles the server strips the embedded notes for; gncapture sees no Báo nợ.
  const canSeeBilling = canSeeBillingDocuments(user?.role);

  const { data: shipment, isLoading } = useShipmentDetail(id);
  const { data: register } = useShipmentCostRegister(id);

  const addCost = useAddShipmentCost(shipmentId);
  const updateCost = useUpdateShipmentCost(shipmentId);
  const deleteCost = useDeleteShipmentCost(shipmentId);
  const uploadDoc = useUploadShipmentDocument(shipmentId);
  const deleteDoc = useDeleteShipmentDocument(shipmentId);

  const [costFormOpen, setCostFormOpen] = useState(false);
  const [costForm, setCostForm] = useState<CostForm>(EMPTY_COST_FORM);
  const [editingCostId, setEditingCostId] = useState<number | null>(null);
  const [formError, setFormError] = useState('');
  // NEPO-61 — chứng từ upload type (B/L, C/O, Kiểm dịch, Hun trùng…), not hardcoded OTHER.
  const [uploadDocType, setUploadDocType] = useState<ShipmentDocType>(ShipmentDocType.OTHER);

  const [noteDraft, setNoteDraft] = useState<BillingDocumentDraftState | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);
  // NEPO-63 — Admin sửa Báo nợ ĐÃ PHÁT HÀNH: the row summary carries no lines,
  // so openEditNote fetches the full document and opens the shared builder in
  // edit mode; its save path PUTs /finance/billing-documents/:id (ADMIN-only)
  // and the server writes the DEBIT_NOTE_UPDATED audit entry.
  const [editNoteDoc, setEditNoteDoc] = useState<BillingDocument | null>(null);
  const [editNoteBusy, setEditNoteBusy] = useState(false);

  const billingDocs = useMemo(
    () => [...(shipment?.billingDocuments ?? [])].sort(
      (a, b) => (a.parentDocumentId ?? 0) - (b.parentDocumentId ?? 0) || a.id - b.id,
    ),
    [shipment?.billingDocuments],
  );
  const mainNote = billingDocs.find((doc) => doc.parentDocumentId == null) ?? null;

  const openAddCost = () => {
    setCostForm({ ...EMPTY_COST_FORM, incurredDate: new Date().toISOString().slice(0, 10) });
    setEditingCostId(null);
    setFormError('');
    setCostFormOpen(true);
  };

  const openEditCost = (row: LotCostRow) => {
    setCostForm({
      costType: row.costType,
      direction: row.direction,
      serviceMode: row.serviceMode,
      description: row.description,
      currency: row.currency,
      fxAmount: row.fxAmount != null ? String(row.fxAmount) : '',
      exchangeRate: row.exchangeRate != null ? String(row.exchangeRate) : '',
      amount: String(row.amount),
      vatRate: row.vatRate || '0.08',
      awaitingInvoice: row.awaitingInvoice,
      incurredDate: row.incurredDate,
      note: row.note ?? '',
    });
    setEditingCostId(row.id);
    setFormError('');
    setCostFormOpen(true);
  };

  const derivedVnd = useMemo(() => {
    if (costForm.currency !== 'USD') return costForm.amount ? Number(costForm.amount) : 0;
    const fx = Number(costForm.fxAmount) || 0;
    const rate = Number(costForm.exchangeRate) || 0;
    return Math.round(fx * rate);
  }, [costForm]);

  const submitCost = async () => {
    setFormError('');
    if (!costForm.description.trim()) {
      setFormError('Diễn giải là bắt buộc.');
      return;
    }
    if (costForm.currency === 'USD' && (!Number(costForm.fxAmount) || !Number(costForm.exchangeRate))) {
      setFormError('Dòng USD cần số tiền gốc và tỷ giá quy đổi.');
      return;
    }
    if (costForm.currency === 'VND' && !(Number(costForm.amount) > 0)) {
      setFormError('Vui lòng nhập số tiền VND hợp lệ.');
      return;
    }
    const payload = {
      costType: costForm.costType,
      direction: costForm.direction,
      serviceMode: costForm.serviceMode,
      description: costForm.description.trim(),
      currency: costForm.currency,
      fxAmount: costForm.currency === 'USD' ? Number(costForm.fxAmount) : null,
      exchangeRate: costForm.currency === 'USD' ? Number(costForm.exchangeRate) : null,
      amount: costForm.currency === 'VND' ? Number(costForm.amount) : derivedVnd,
      vatRate: Number(costForm.vatRate) || 0,
      awaitingInvoice: costForm.awaitingInvoice,
      incurredDate: costForm.incurredDate,
      note: costForm.note.trim() || null,
    };
    try {
      if (editingCostId != null) {
        await updateCost.mutateAsync({ costId: editingCostId, data: payload });
      } else {
        await addCost.mutateAsync(payload);
      }
      setCostFormOpen(false);
      showToast({ kind: 'success', message: 'Đã lưu dòng chi phí' });
    } catch (error) {
      setFormError((error as Error).message || 'Không lưu được dòng chi phí');
    }
  };

  const removeCost = (row: LotCostRow) => {
    void confirm(`Xóa "${row.description}" (${formatCurrency(row.amount)})?`, {
      confirmLabel: 'Xóa',
    }).then(async (ok) => {
      if (!ok) return;
      try {
        await deleteCost.mutateAsync(row.id);
        showToast({ kind: 'success', message: 'Đã xóa dòng chi phí' });
      } catch (error) {
        showToast({ kind: 'error', message: (error as Error).message });
      }
    });
  };

  const onUploadDoc = async (file: File | undefined, docType: string) => {
    if (!file) return;
    try {
      await uploadDoc.mutateAsync({ file, input: { docType: docType as never } });
      showToast({ kind: 'success', message: 'Đã tải lên chứng từ' });
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    }
  };

  const downloadDoc = async (docId: number, fileName: string) => {
    try {
      const blob = await shipmentClient.documentFile(shipmentId, docId);
      downloadBlob(blob, fileName);
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    }
  };

  // ─── Per-lot debit note chain ─────────────────────────────────────────────

  const draftMainNote = async () => {
    if (!shipment) return;
    setNoteBusy(true);
    try {
      const today = new Date();
      const monthFrom = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      const monthTo = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString().slice(0, 10);
      const draft = await financialClient.generateBillingDraft({
        type: 'DEBIT_NOTE',
        entityType: 'CUSTOMER',
        entityId: shipment.customerId,
        rangeFrom: monthFrom,
        rangeTo: monthTo,
        shipmentId: shipment.id,
      });
      setNoteDraft({
        lines: draft.lines,
        totalInclVat: draft.totalInclVat,
        entityName: draft.entityName,
        rangeFrom: monthFrom,
        rangeTo: monthTo,
      });
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message || 'Không lập được Báo nợ' });
    } finally {
      setNoteBusy(false);
    }
  };

  const saveMainNote = async () => {
    if (!noteDraft || !shipment) return;
    setNoteBusy(true);
    try {
      const doc = await financialClient.saveBillingDocument({
        type: 'DEBIT_NOTE',
        entityType: 'CUSTOMER',
        entityId: shipment.customerId,
        entityName: noteDraft.entityName,
        rangeFrom: noteDraft.rangeFrom,
        rangeTo: noteDraft.rangeTo,
        // renderData travels as a jsonb record on the wire — the typed
        // BillingLineRenderData view is structurally the same payload.
        lines: noteDraft.lines as unknown as SaveBillingDocumentInput['lines'],
        shipmentId: shipment.id,
      });
      setNoteDraft(null);
      await queryClient.invalidateQueries({ queryKey: qk.shipments.detail(shipmentId) });
      showToast({ kind: 'success', message: `Đã lưu Báo nợ ${doc.documentNumber ?? ''}` });
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message || 'Không lưu được Báo nợ' });
    } finally {
      setNoteBusy(false);
    }
  };

  const issueNote = async (doc: ShipmentBillingDocSummary) => {
    try {
      await financialClient.issueBillingDocument(doc.id);
      await queryClient.invalidateQueries({ queryKey: qk.shipments.detail(shipmentId) });
      showToast({ kind: 'success', message: 'Đã phát hành Báo nợ' });
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    }
  };

  const supplementNote = async (doc: ShipmentBillingDocSummary) => {
    try {
      const supplement = await financialClient.supplementBillingDocument(doc.id);
      await queryClient.invalidateQueries({ queryKey: qk.shipments.detail(shipmentId) });
      showToast({ kind: 'success', message: `Đã tạo bổ sung ${supplement.documentNumber ?? ''}` });
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    }
  };

  // NEPO-63 — a draft note (chưa phát hành, -BS01 supplement included) deletes
  // back to the pre-note state; the backend refuses issued notes.
  const removeNote = async (doc: ShipmentBillingDocSummary) => {
    const ok = await confirm(
      `Xóa Báo nợ ${doc.documentNumber ?? `#${doc.id}`} (${formatCurrency(doc.totalInclVat)}, chưa phát hành)? Công nợ sẽ quay lại như trước khi lập.`,
      { variant: 'danger', confirmLabel: 'Xóa' },
    );
    if (!ok) return;
    try {
      await financialClient.deleteBillingDocument(doc.id);
      await queryClient.invalidateQueries({ queryKey: qk.shipments.detail(shipmentId) });
      showToast({ kind: 'success', message: 'Đã xóa Báo nợ' });
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    }
  };

  const openEditNote = async (doc: ShipmentBillingDocSummary) => {
    setEditNoteBusy(true);
    try {
      setEditNoteDoc(await financialClient.getBillingDocument(doc.id));
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    } finally {
      setEditNoteBusy(false);
    }
  };

  const exportNote = async (doc: ShipmentBillingDocSummary) => {
    try {
      // api.getBlob owns the /api prefix + auth header — a raw fetch here
      // produced /finance/... and hit the SPA's index.html instead.
      const blob = await api.getBlob(financialClient.getBillingDocumentExportUrl(doc.id));
      downloadBlob(blob, `${doc.documentNumber ?? `bao-no-${doc.id}`}.xlsx`);
    } catch (error) {
      showToast({ kind: 'error', message: (error as Error).message });
    }
  };

  if (isLoading || !shipment) {
    return <div className="shipment-list-loading">Đang tải lô hàng…</div>;
  }

  const flow = flowTypeLabel(shipment.flowType);
  const route = routeText(shipment.pol, shipment.pod);
  const profit = profitRows(shipment.profit);

  return (
    <div className="shipment-detail">
      <Breadcrumbs
        className="shipment-list-page__crumbs"
        items={[
          { label: 'Tổng quan', to: '/dashboard' },
          { label: 'Lô hàng', to: '/shipments' },
          { label: shipment.shipmentCode },
        ]}
        renderLink={(to, children) => <Link to={to}>{children}</Link>}
      />
      <PageHeader
        title={`${shipment.shipmentCode}${flow ? ` · ${flow}` : ''}`}
        description={[shipment.customerName, route].filter(Boolean).join(' — ')}
        iconName="cargo"
        action={
          canIssueDebitNote && !mainNote && (
            <button className="btn btn--primary btn--sm" onClick={draftMainNote} disabled={noteBusy}>
              <Receipt size={14} style={{ marginRight: 6 }} aria-hidden="true" />
              Lập Báo nợ lô
            </button>
          )
        }
      />

      {/* Profit strip */}
      <div className="shipment-band">
        {profit.map((row) => (
          <div key={row.key} className="shipment-band__total" title={row.title}>
            <span className="shipment-band__label">{row.label}</span>
            <span className={`shipment-band__amount${row.valueClassName === 'is-negative' ? ' is-negative' : ''}`}>
              {formatCurrency(row.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="shipment-detail__grid">
        <div>
          {/* ─── Lot cost register (NEPO-62) ─── */}
          <section className="shipment-detail__card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="shipment-detail__card-title">Chi phí theo lô hàng</h2>
              {canWrite && (
                <button className="btn btn--secondary btn--sm" onClick={openAddCost}>
                  <Plus size={14} style={{ marginRight: 4 }} aria-hidden="true" /> Thêm dòng
                </button>
              )}
            </div>

            {(register?.groups ?? []).map((group) => (
              <div key={group.group}>
                <div className="lot-register__group-header">
                  <span>{group.label}</span>
                  <span className="lot-register__group-totals">
                    <span className="is-collect">Thu {formatCurrency(group.collectTotal)}</span>
                    <span className="is-pay">Chi {formatCurrency(group.payTotal)}</span>
                  </span>
                </div>
                {group.rows.length > 0 && (
                  <div className="table-scroll">
                    <table className="lot-register__table">
                    <thead>
                      <tr>
                        <th>Diễn giải</th>
                        <th>Loại</th>
                        <th>Tiền (VNĐ)</th>
                        <th>VAT</th>
                        <th>Trạng thái</th>
                        {canWrite && <th />}
                        {!canWrite && canEditCosts && <th />}
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={row.id}>
                          <td>
                            {row.description}
                            <span className="lot-register__fx">
                              {formatDate(row.incurredDate)}
                              {row.note ? ` — ${row.note}` : ''}
                            </span>
                          </td>
                          <td>
                            <div className="lot-register__row-tags">
                              <span className={`lot-register__tag${row.direction === 'CUSTOMER' ? ' lot-register__tag--collect' : ' lot-register__tag--pay'}`}>
                                {row.direction === 'CUSTOMER' ? 'Thu khách' : 'Trả NCC'}
                              </span>
                              <span className="lot-register__tag">
                                {row.serviceMode === 'ADVANCE' ? 'Nộp hộ' : 'Dịch vụ'}
                              </span>
                            </div>
                          </td>
                          <td className="is-money">
                            {/* Chờ hóa đơn: in không có số tiền (không vào tổng). */}
                            {row.awaitingInvoice ? (
                              <span className="lot-register__fx">—</span>
                            ) : (
                              <>
                                {formatCurrency(row.amount)}
                                {row.currency === 'USD' && row.fxAmount != null && (
                                  <span className="lot-register__fx">
                                    ${formatCurrency(row.fxAmount)} × {formatCurrency(row.exchangeRate ?? 0)}
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td className="is-money">{Math.round(Number(row.vatRate) * 100)}%</td>
                          <td>
                            {/* NEPO-63 r4 — pill vocabulary ('Chưa lên/Đã lên Báo
                                nợ') is debit-note language: roles the server
                                strips billing data for see a neutral dash. */}
                            {canSeeBilling && row.status ? (
                              <StatusPill variant={FEE_STATUS_VARIANT[row.status]}>
                                {LOT_FEE_STATUS_LABELS[row.status]}
                              </StatusPill>
                            ) : (
                              <span className="lot-register__fx">—</span>
                            )}
                          </td>
                          {(canWrite || canEditCosts) && (
                            <td>
                              <div className="lot-billing__actions">
                                <button className="icon-btn" title="Sửa" onClick={() => openEditCost(row)}>
                                  <PencilLine size={14} />
                                </button>
                                {canWrite && (
                                  <button className="icon-btn" title="Xóa" onClick={() => removeCost(row)}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            ))}

            {/* Chi phí chuyển xe — derived, never manually bookable. */}
            <div className="lot-register__group-header">
              <span>Chi phí chuyển xe</span>
              <span className="lot-register__group-totals">
                <span className="is-pay">Chi {formatCurrency(register?.truckTransfer.total ?? 0)}</span>
              </span>
            </div>
            {(register?.truckTransfer.rows.length ?? 0) > 0 && (
              <div className="table-scroll">
                <table className="lot-register__table">
                <tbody>
                  {register!.truckTransfer.rows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        {row.label}
                        {row.tripCode && <span className="lot-register__fx">{row.tripCode}</span>}
                      </td>
                      <td className="is-money">{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}

            <div className="lot-register__totals">
              <div className="lot-register__totals-item">
                <span className="lot-register__totals-label">Tổng thu khách</span>
                <span className="lot-register__totals-value is-collect">
                  {formatCurrency(register?.totals.collect ?? 0)}
                </span>
              </div>
              <div className="lot-register__totals-item">
                <span className="lot-register__totals-label">Tổng trả NCC</span>
                <span className="lot-register__totals-value is-pay">
                  {formatCurrency(register?.totals.pay ?? 0)}
                </span>
              </div>
            </div>
          </section>

          {/* ─── Per-lot debit notes — NEPO-63 (QA 3b): the section is hidden
              entirely for roles the server strips the embedded notes for;
              gncapture sees no Báo nợ on the lô page. ─── */}
          {canSeeBilling && (<section className="shipment-detail__card">
            <h2 className="shipment-detail__card-title">Giấy báo nợ theo lô</h2>
            {billingDocs.length === 0 && (
              <div className="lot-billing__empty">
                Chưa có Báo nợ. Nhấn "Lập Báo nợ lô" để tổng hợp cước + phí thu khách của lô.
              </div>
            )}
            {billingDocs.map((doc) => (
              <div key={doc.id} className="lot-billing__row">
                <div>
                  <span className="lot-billing__number">
                    {doc.documentNumber ?? `#${doc.id}`}
                    {doc.parentDocumentId != null && ' (bổ sung)'}
                  </span>
                  <div className="lot-billing__sub">
                    {formatCurrency(doc.totalInclVat)} · {formatDate(doc.rangeFrom)}–{formatDate(doc.rangeTo)}
                    {doc.issuedAt ? ` · phát hành ${formatDate(doc.issuedAt.slice(0, 10))}` : ' · chưa phát hành'}
                  </div>
                </div>
                <div className="lot-billing__actions">
                  {/* NEPO-63 — phát hành = POST /:id/issue, roles
                      ADMIN/MANAGER/ACCOUNTANT ("tạo + chốt" §6/§7 matrix). */}
                  {!doc.issuedAt && canIssueDebitNote && (
                    <button className="icon-btn" title="Phát hành (khóa Báo nợ)" onClick={() => issueNote(doc)}>
                      <Send size={14} />
                    </button>
                  )}
                  {/* NEPO-63 — supplement = POST /:id/supplement, roles
                      ADMIN/MANAGER/ACCOUNTANT: ketoan supplements, Ops biển
                      must not be offered a button the API 403s. */}
                  {doc.issuedAt && doc.parentDocumentId == null && canIssueDebitNote && (
                    <button className="icon-btn" title="Bổ sung -BS01 (phí phát sinh sau)" onClick={() => supplementNote(doc)}>
                      <Plus size={14} />
                    </button>
                  )}
                  {/* NEPO-63 — sửa Báo nợ ĐÃ PHÁT HÀNH: ADMIN-only (backend
                      PUT requireRoles(Role.ADMIN) 403s the rest), every save
                      writes the DEBIT_NOTE_UPDATED audit entry. Ketoan/Ops
                      biển see no button — đúng ma trận §6. */}
                  {doc.issuedAt && canManageBillingDocuments(user?.role) && (
                    <button className="icon-btn" title="Sửa Báo nợ đã phát hành (ghi nhật ký)" disabled={editNoteBusy} onClick={() => void openEditNote(doc)}>
                      <PencilLine size={14} />
                    </button>
                  )}
                  {/* NEPO-63 — draft delete = DELETE /:id, ADMIN-only backend. */}
                  {!doc.issuedAt && canManageBillingDocuments(user?.role) && (
                    <button className="icon-btn" title="Xóa Báo nợ chưa phát hành (công nợ về như trước khi lập)" onClick={() => void removeNote(doc)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button className="icon-btn" title="Xuất Excel" onClick={() => exportNote(doc)}>
                    <Download size={14} />
                  </button>
                </div>
              </div>
            ))}
            <p className="lot-billing__sub" style={{ marginTop: 10 }}>
              Báo nợ đã phát hành: chỉ Quản trị viên sửa được — mỗi lần sửa ghi nhật ký hệ thống, bút toán công nợ điều chỉnh theo chênh lệch; phí phát sinh sau lên Báo nợ bổ sung -BS01.
              Báo nợ chưa phát hành có thể xóa: công nợ quay lại như trước khi lập.
              Phí "Chờ hóa đơn" in trên Báo nợ không có số tiền và không cộng vào Tổng cộng.
            </p>
          </section>
          )}
        </div>

        <div>
          {/* ─── Thông tin lô ─── */}
          <section className="shipment-detail__card">
            <h2 className="shipment-detail__card-title">Thông tin lô hàng</h2>
            <div className="shipment-detail__info-grid">
              <InfoItem label="Số B/L" value={shipment.blNo} />
              <InfoItem label="Tàu / Chuyến" value={shipment.vesselVoyage} />
              <InfoItem label="POL - POD" value={route} />
              <InfoItem label="ETD" value={shipment.etd ? formatDate(shipment.etd) : null} />
              <InfoItem label="ETA" value={shipment.eta ? formatDate(shipment.eta) : null} />
              <InfoItem label="Cut-off" value={cutoffValue(shipment.cutoffDate)} />
              <InfoItem label="Tờ khai" value={declarationValue(shipment)} />
              <InfoItem label="Booking" value={shipment.bookingNo} />
              <InfoItem label="Hãng tàu" value={shipment.shippingLine} />
              <InfoItem label="Cont / Seal" value={shipment.containerSeals} />
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
              {canWrite && (
                <button className="btn btn--secondary btn--sm" onClick={() => setEditOpen(true)}>
                  <PencilLine size={14} style={{ marginRight: 4 }} aria-hidden="true" /> Sửa lô
                </button>
              )}
              <button className="btn btn--secondary btn--sm" onClick={() => navigate(`/shipments`)}>
                Danh sách lô
              </button>
            </div>
          </section>

          {/* ─── Trips ─── */}
          <section className="shipment-detail__card">
            <h2 className="shipment-detail__card-title">Chuyến liên quan ({shipment.trips.length})</h2>
            {shipment.trips.length === 0 && <div className="lot-billing__empty">Chưa có chuyến nào gắn lô.</div>}
            {shipment.trips.map((trip) => (
              <div key={trip.id} className="lot-billing__row">
                <div>
                  <Link to={`/trips/${trip.id}`} className="lot-billing__number">{trip.tripCode ?? `#${trip.id}`}</Link>
                  <div className="lot-billing__sub">
                    {tripStatusLabel(trip.status)} · {formatDate(trip.departureDate)}
                    {trip.plate ? ` · ${trip.plate}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="lot-register__fx">DT {formatCurrency(trip.revenue ?? 0)}</div>
                  <div className="lot-register__fx">CP {formatCurrency(trip.totalCost ?? 0)}</div>
                </div>
              </div>
            ))}
          </section>

          {/* ─── Documents ─── */}
          <section className="shipment-detail__card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="shipment-detail__card-title">Chứng từ</h2>
              {canWrite && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      void onUploadDoc(e.target.files?.[0], uploadDocType);
                      e.target.value = '';
                    }}
                  />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      className="input"
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value as ShipmentDocType)}
                      aria-label="Loại chứng từ"
                    >
                      {(Object.values(ShipmentDocType) as ShipmentDocType[]).map((docType) => (
                        <option key={docType} value={docType}>{SHIPMENT_DOC_TYPE_LABELS[docType]}</option>
                      ))}
                    </select>
                    <button className="btn btn--secondary btn--sm" onClick={() => fileInputRef.current?.click()}>
                      <FileText size={14} style={{ marginRight: 4 }} aria-hidden="true" /> Tải lên
                    </button>
                  </div>
                </>
              )}
            </div>
            {shipment.documents.length === 0 && <div className="lot-billing__empty">Chưa có chứng từ nào.</div>}
            {shipment.documents.map((doc) => (
              <div key={doc.id} className="lot-billing__row">
                <div>
                  <div>{doc.fileName}</div>
                  <div className="lot-billing__sub">{SHIPMENT_DOC_TYPE_LABELS[doc.docType] ?? doc.docType} · {formatFileSize(doc.fileSize)}</div>
                </div>
                <div className="lot-billing__actions">
                  <button className="icon-btn" title="Tải xuống" onClick={() => downloadDoc(doc.id, doc.fileName)}>
                    <Download size={14} />
                  </button>
                  {canWrite && (
                    <button
                      className="icon-btn"
                      title="Xóa"
                      onClick={() => void confirm(`Xóa chứng từ ${doc.fileName}?`, { confirmLabel: 'Xóa' }).then(async (ok) => {
                        if (!ok) return;
                        await deleteDoc.mutateAsync(doc.id);
                      })}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* Cost add/edit modal */}
      {costFormOpen && (
        <Modal isOpen title={editingCostId != null ? 'Sửa dòng chi phí' : 'Thêm dòng chi phí'} onClose={() => setCostFormOpen(false)}>
          <div className="lot-cost-form">
            <label className="lot-cost-form__field">
              <span className="lot-cost-form__label">Nhóm phí</span>
              <select
                className="input"
                value={costForm.costType}
                onChange={(e) => setCostForm((f) => ({ ...f, costType: e.target.value as FeeGroup }))}
              >
                {FEE_GROUP_OPTIONS.map((group) => (
                  <option key={group} value={group}>{FEE_GROUP_LABELS[group]}</option>
                ))}
              </select>
            </label>
            <label className="lot-cost-form__field">
              <span className="lot-cost-form__label">Chiều</span>
              <select
                className="input"
                value={costForm.direction}
                onChange={(e) => setCostForm((f) => ({ ...f, direction: e.target.value as 'CUSTOMER' | 'SUPPLIER' }))}
              >
                <option value="CUSTOMER">Thu khách</option>
                <option value="SUPPLIER">Trả NCC</option>
              </select>
            </label>
            <label className="lot-cost-form__field">
              <span className="lot-cost-form__label">Loại hình</span>
              <select
                className="input"
                value={costForm.serviceMode}
                onChange={(e) => setCostForm((f) => ({ ...f, serviceMode: e.target.value as 'SERVICE' | 'ADVANCE' }))}
              >
                <option value="SERVICE">Dịch vụ</option>
                <option value="ADVANCE">Nộp hộ</option>
              </select>
            </label>
            <label className="lot-cost-form__field">
              <span className="lot-cost-form__label">Ngày phát sinh</span>
              <input
                type="date"
                className="input"
                value={costForm.incurredDate}
                onChange={(e) => setCostForm((f) => ({ ...f, incurredDate: e.target.value }))}
              />
            </label>
            <label className="lot-cost-form__field lot-cost-form__field--full">
              <span className="lot-cost-form__label">Diễn giải *</span>
              <input
                className="input"
                value={costForm.description}
                onChange={(e) => setCostForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="VD: Phí nâng container tại cảng"
              />
            </label>
            <label className="lot-cost-form__field">
              <span className="lot-cost-form__label">Tiền tệ</span>
              <select
                className="input"
                value={costForm.currency}
                onChange={(e) => setCostForm((f) => ({ ...f, currency: e.target.value as 'VND' | 'USD' }))}
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </label>
            {costForm.currency === 'VND' ? (
              <label className="lot-cost-form__field">
                <span className="lot-cost-form__label">Số tiền (VNĐ) *</span>
                <input
                  className="input"
                  inputMode="numeric"
                  value={costForm.amount}
                  onChange={(e) => setCostForm((f) => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))}
                />
              </label>
            ) : (
              <>
                <label className="lot-cost-form__field">
                  <span className="lot-cost-form__label">Số tiền gốc (USD) *</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={costForm.fxAmount}
                    onChange={(e) => setCostForm((f) => ({ ...f, fxAmount: e.target.value }))}
                  />
                </label>
                <label className="lot-cost-form__field">
                  <span className="lot-cost-form__label">Tỷ giá *</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={costForm.exchangeRate}
                    onChange={(e) => setCostForm((f) => ({ ...f, exchangeRate: e.target.value }))}
                  />
                </label>
                <div className="lot-cost-form__field">
                  <span className="lot-cost-form__label">Quy VND (làm tròn)</span>
                  <div className="input" style={{ background: 'var(--surface-2)' }}>
                    {formatCurrency(derivedVnd)}
                  </div>
                </div>
              </>
            )}
            <label className="lot-cost-form__field">
              <span className="lot-cost-form__label">VAT (%)</span>
              <select
                className="input"
                value={costForm.vatRate}
                onChange={(e) => setCostForm((f) => ({ ...f, vatRate: e.target.value }))}
              >
                <option value="0">0%</option>
                <option value="0.05">5%</option>
                <option value="0.08">8%</option>
                <option value="0.1">10%</option>
              </select>
            </label>
            <label className="lot-cost-form__field lot-cost-form__field--full lot-cost-form__checkbox">
              <input
                type="checkbox"
                checked={costForm.awaitingInvoice}
                onChange={(e) => setCostForm((f) => ({ ...f, awaitingInvoice: e.target.checked }))}
              />
              Chờ hóa đơn — {canSeeBilling ? 'in trên Báo nợ không có số tiền' : 'in không có số tiền'}, không cộng Tổng cộng
            </label>
            <label className="lot-cost-form__field lot-cost-form__field--full">
              <span className="lot-cost-form__label">Ghi chú</span>
              <input
                className="input"
                value={costForm.note}
                onChange={(e) => setCostForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>
          </div>
          {formError && <p style={{ color: 'var(--danger)', marginTop: 10 }}>{formError}</p>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setCostFormOpen(false)}>Hủy</button>
            <button
              className="btn btn--primary btn--sm"
              onClick={submitCost}
              disabled={addCost.isPending || updateCost.isPending}
            >
              Lưu
            </button>
          </div>
        </Modal>
      )}

      {/* New note preview */}
      {noteDraft && (
        <Modal isOpen title="Xem trước Báo nợ theo lô" onClose={() => setNoteDraft(null)}>
          <p style={{ marginTop: 0 }}>
            {noteDraft.entityName} · {formatDate(noteDraft.rangeFrom)}–{formatDate(noteDraft.rangeTo)}
          </p>
          <div className="table-scroll">
            <table className="lot-register__table">
              <thead>
                <tr><th>Diễn giải</th><th style={{ textAlign: 'right' }}>Số tiền (VNĐ)</th></tr>
              </thead>
            <tbody>
              {noteDraft.lines.map((line, idx) => (
                <tr key={`${line.sourceType}-${line.sourceId ?? idx}`}>
                  <td>
                    {line.description}
                    {line.renderData?.blankAmount && (
                      <span className="lot-register__tag" style={{ marginLeft: 6 }}>Chờ hóa đơn</span>
                    )}
                  </td>
                  <td className={`is-money${line.renderData?.blankAmount ? ' is-blank' : ''}`}>
                    {line.renderData?.blankAmount ? '—' : formatCurrency(line.baseAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          <div className="lot-register__totals">
            <div className="lot-register__totals-item">
              <span className="lot-register__totals-label">Tổng cộng</span>
              <span className="lot-register__totals-value">{formatCurrency(noteDraft.totalInclVat)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setNoteDraft(null)}>Hủy</button>
            <button className="btn btn--primary btn--sm" onClick={saveMainNote} disabled={noteBusy}>
              Lưu Báo nợ
            </button>
          </div>
        </Modal>
      )}
      {/* NEPO-63 — Sửa Báo nợ đã phát hành (ADMIN-only): the shared builder
          in edit mode; its save/export path calls updateBillingDocument (PUT)
          and the server audit-logs DEBIT_NOTE_UPDATED with the note number. */}
      {editNoteDoc && (
        <BillingDocumentBuilder
          isOpen
          type="DEBIT_NOTE"
          entityType="CUSTOMER"
          entityId={editNoteDoc.entityId}
          entityName={editNoteDoc.entityName ?? shipment.customerName ?? ''}
          shipmentId={shipment.id}
          initialDoc={editNoteDoc}
          onClose={() => setEditNoteDoc(null)}
          onSaved={() => void queryClient.invalidateQueries({ queryKey: qk.shipments.detail(shipmentId) })}
        />
      )}
      {canWrite && (
        <ShipmentFormModal
          isOpen={editOpen && !!shipment}
          onClose={() => {
            setEditOpen(false);
            if (searchParams.get('edit')) setSearchParams({}, { replace: true });
          }}
          shipment={editOpen ? shipment ?? null : null}
        />
      )}
      {confirmDialog}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="shipment-detail__info-item">
      <div className="shipment-detail__info-label">{label}</div>
      <div className="shipment-detail__info-value">{value}</div>
    </div>
  );
}

/** Cut-off ngày + cảnh báo khi trong cửa sổ SHIPMENT_CUTOFF_WARN_DAYS (NEPO-61). */
function cutoffValue(cutoffDate: string | null | undefined): string | null {
  if (!cutoffDate) return null;
  const days = cutoffDaysLeft(cutoffDate);
  return isCutoffUrgent(cutoffDate)
    ? `${formatDate(cutoffDate)} · sắp cut-off${days != null && days < 0 ? ' (đã qua)' : ''}`
    : formatDate(cutoffDate);
}

function declarationValue(shipment: ShipmentDetail): string | null {
  const no = shipment.customsDeclarationNo;
  if (!no) return null;
  return shipment.customsDeclarationDate ? `${no} (${formatDate(shipment.customsDeclarationDate)})` : no;
}

interface BillingDocumentDraftState {
  lines: BillingDraftLine[];
  totalInclVat: number;
  entityName: string;
  rangeFrom: string;
  rangeTo: string;
}

export type { ShipmentCost };
