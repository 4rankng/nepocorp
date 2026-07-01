import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Calendar, MapPin, Package, Trash2, Loader2, AlertCircle, Plus, DollarSign, Camera } from 'lucide-react';
import { formatDate, formatCurrency } from '../lib/format';
import { api } from '../lib/api';
import { FORWARDER_EXPENSE_TYPE_DEFAULTS } from '@tingting/shared';
import { TRIP_STATUS_LABELS, type TripStatus } from '@tingting/shared';
import { StatusPill, FormGroup, useConfirm } from '../components/UI';
import TripLegsPanel from '../components/trip/TripLegsPanel';
import { qk } from '../api/keys';
import { useForwarderTripDetail, useCreateForwarderContainer, useCreateForwarderExpense, useDeleteForwarderExpense } from '../hooks/useQueries';
import { useCatalogs } from '../hooks/useCatalogs';
import { useQuery } from '@tanstack/react-query';
import { forwarderClient } from '../api/forwarderClient';
import { usePageAnimations } from '../hooks/animations';
import { useBackShortcut } from '../hooks/useBackShortcut';
import './ForwarderTripDetailPage.css';

/** Forwarder container instance shape returned by the trip-detail API. */
interface ForwarderContainer {
  id: number;
  containerNumber?: string;
  sealNumber?: string | null;
  notes?: string | null;
}

function tripStatusVariant(status: TripStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'IN_TRANSIT': return 'info';      // blue
    case 'COMPLETED': return 'success';    // green
    case 'LOCKED': return 'neutral';       // slate gray
    case 'CANCELED': return 'danger';      // red
    default: return 'neutral';             // CREATED — slate gray
  }
}

export default function ForwarderTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tripId = parseInt(id || '0', 10);

  const { data: trip, isLoading: loading, error: queryError } = useForwarderTripDetail(tripId);
  const { rootRef } = usePageAnimations({ ready: !loading });

  const createContainerMut = useCreateForwarderContainer();
  const createExpenseMut = useCreateForwarderExpense();
  const deleteExpenseMut = useDeleteForwarderExpense();

  const { data: catalogs } = useCatalogs();
  const forwarderExpenseTypeOptions = catalogs?.forwarderExpenseTypes ?? [];

  const { data: suppliersResp } = useQuery({
    queryKey: qk.forwarder.suppliers,
    queryFn: () => forwarderClient.listSuppliers(),
    staleTime: 5 * 60 * 1000,
  });
  const supplierOptions = suppliersResp?.items ?? [];

  const [showContainerForm, setShowContainerForm] = useState(false);
  const [containerForm, setContainerForm] = useState({ containerNumber: '', sealNumber: '', notes: '' });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    expenseType: 'LIFTING' as string,
    buyAmount: '',
    sellAmount: '',
    settlementMethod: 'FORWARDER_ADVANCE' as 'FORWARDER_ADVANCE' | 'COMPANY_DIRECT',
    supplierId: '',
    tripContainerId: '',
    invoiceNumber: '',
    invoiceDate: '',
    declarationNumber: '',
    note: '',
  });
  const [expenseErrors, setExpenseErrors] = useState<{ buyAmount?: string; declarationNumber?: string; supplierId?: string }>({});

  // Expense photo state: maps expenseId → photo URLs
  const [expensePhotos, setExpensePhotos] = useState<Record<number, string[]>>({});
  const [uploadingExpenseId, setUploadingExpenseId] = useState<number | null>(null);

  const { confirm, dialog } = useConfirm();
  const handleBack = () => navigate('/my-forwarder-trips');
  const isDirty = () =>
    (showContainerForm && Boolean(containerForm.containerNumber || containerForm.sealNumber || containerForm.notes)) ||
    (showExpenseForm && Boolean(expenseForm.buyAmount || expenseForm.supplierId || expenseForm.invoiceNumber || expenseForm.declarationNumber || expenseForm.note));
  useBackShortcut(handleBack, {
    isDirty,
    confirmDiscard: () => confirm('Thoát mà không lưu? Các thay đổi chưa lưu sẽ bị mất.', { variant: 'warning', confirmLabel: 'Thoát' }),
  });

  async function loadExpensePhotos(expenseId: number) {
    try {
      const res = await api.get<{ items: Array<{ id: number; storageKey: string }> }>(`/forwarder/me/expenses/${expenseId}/photos`);
      const urls = res.items.map((p) => `/api/photos/${encodeURIComponent(p.storageKey)}`);
      setExpensePhotos(prev => ({ ...prev, [expenseId]: urls }));
    } catch { /* ignore */ }
  }

  async function handleUploadPhoto(expenseId: number, file: File) {
    setUploadingExpenseId(expenseId);
    const form = new FormData();
    form.append('file', file);
    try {
      await api.post(`/forwarder/me/expenses/${expenseId}/photos`, form);
      await loadExpensePhotos(expenseId);
    } finally {
      setUploadingExpenseId(null);
    }
  }

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
      <Loader2 size={24} className="spin" style={{ display: 'inline-block' }} />
      <p style={{ marginTop: 12 }}>Đang tải…</p>
    </div>
  );

  if (queryError || !trip) return (
    <div style={{ padding: 24 }}>
      <button className="btn btn--ghost" onClick={handleBack} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ArrowLeft size={16} /> Quay lại
      </button>
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)' }}>
        <AlertCircle size={32} style={{ marginBottom: 12 }} />
        <p>{queryError ? 'Không thể tải thông tin chuyến đi' : 'Không tìm thấy chuyến đi'}</p>
      </div>
    </div>
  );

  const handleAddContainer = () => {
    if (!containerForm.containerNumber.trim()) return;
    createContainerMut.mutate(
      {
        tripId,
        data: {
          containerNumber: containerForm.containerNumber,
          sealNumber: containerForm.sealNumber || undefined,
          notes: containerForm.notes || undefined,
        },
      },
      { onSuccess: () => { setContainerForm({ containerNumber: '', sealNumber: '', notes: '' }); setShowContainerForm(false); } },
    );
  };

  const handleExpenseTypeChange = (newType: string) => {
    const hasMarkup = FORWARDER_EXPENSE_TYPE_DEFAULTS[newType]?.defaultMarkup ?? false;
    setExpenseForm(f => ({
      ...f,
      expenseType: newType,
      // For at-cost types, keep sell in sync; for markup types, clear it for manual entry
      sellAmount: hasMarkup ? '' : f.buyAmount,
    }));
    setExpenseErrors({});
  };

  const handleBuyAmountChange = (val: string) => {
    const hasMarkup = FORWARDER_EXPENSE_TYPE_DEFAULTS[expenseForm.expenseType]?.defaultMarkup ?? false;
    setExpenseForm(f => ({
      ...f,
      buyAmount: val,
      // Auto-sync sell for at-cost types
      sellAmount: hasMarkup ? f.sellAmount : val,
    }));
    if (expenseErrors.buyAmount) setExpenseErrors(e => ({ ...e, buyAmount: undefined }));
  };

  const handleAddExpense = () => {
    const buyAmount = parseFloat(expenseForm.buyAmount);
    const errors: { buyAmount?: string; declarationNumber?: string; supplierId?: string } = {};
    if (!buyAmount || buyAmount <= 0) errors.buyAmount = 'Giá mua vào phải lớn hơn 0';
    if (expenseForm.expenseType === 'CUSTOMS' && !expenseForm.declarationNumber.trim()) {
      errors.declarationNumber = 'Số tờ khai hải quan là bắt buộc cho phí hải quan';
    }
    if (expenseForm.settlementMethod === 'COMPANY_DIRECT' && !expenseForm.supplierId) {
      errors.supplierId = 'Cần chọn NCC khi công ty trả trực tiếp';
    }
    if (Object.keys(errors).length > 0) { setExpenseErrors(errors); return; }

    const sellAmount = parseFloat(expenseForm.sellAmount) || 0;
    const supplierIdNum = expenseForm.supplierId ? parseInt(expenseForm.supplierId, 10) : undefined;
    createExpenseMut.mutate(
      {
        tripId,
        expenseType: expenseForm.expenseType,
        buyAmount,
        sellAmount: sellAmount >= 0 ? sellAmount : 0,
        settlementMethod: expenseForm.settlementMethod,
        supplierId: supplierIdNum,
        invoiceNumber: expenseForm.invoiceNumber.trim() || undefined,
        invoiceDate: expenseForm.invoiceDate || undefined,
        declarationNumber: expenseForm.declarationNumber.trim() || undefined,
        tripContainerId: expenseForm.tripContainerId ? parseInt(expenseForm.tripContainerId, 10) : undefined,
        note: expenseForm.note.trim() || undefined,
      },
      {
        onSuccess: () => {
          setExpenseForm({
            expenseType: 'LIFTING',
            buyAmount: '',
            sellAmount: '',
            settlementMethod: 'FORWARDER_ADVANCE',
            supplierId: '',
            tripContainerId: '',
            invoiceNumber: '',
            invoiceDate: '',
            declarationNumber: '',
            note: '',
          });
          setExpenseErrors({});
          setShowExpenseForm(false);
        },
      },
    );
  };

  const handleDeleteExpense = (expenseId: number) => {
    deleteExpenseMut.mutate({ id: expenseId, tripId });
  };

  const containers = (trip.containers || []) as ForwarderContainer[];
  const expenses = trip.expenses || [];
  const legs = (trip.legs || []) as Array<{ id: number; sequence: number; origin: string; destination: string; km: number; loadingType: string; polylinePath?: string | null }>;
  const selectedExpenseContainer = containers.find(c => String(c.id) === expenseForm.tripContainerId);
  const openExpenseForm = () => {
    setShowExpenseForm(prev => {
      const willOpen = !prev;
      if (willOpen && !expenseForm.tripContainerId && containers.length === 1) {
        setExpenseForm(f => ({ ...f, tripContainerId: String(containers[0].id) }));
      }
      return willOpen;
    });
  };

  return (
    <div ref={rootRef} style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 40 }}>
      {dialog}
      {/* Back button + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 8px' }}>
        <button
          className="btn btn--ghost btn--icon"
          onClick={handleBack}
          aria-label="Quay lại"
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/assets/icons/03-trip-log-so-chuyen-chuyen-xe.png" alt="" style={{ width: 32, height: 32, flexShrink: 0 }} />
              {trip.routeName || 'Chuyến đi'}
            </h1>
            <StatusPill variant={tripStatusVariant(trip.status)}>
              {TRIP_STATUS_LABELS[trip.status as TripStatus] || trip.status}
            </StatusPill>
            {trip.tripCode && (
              <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{trip.tripCode}</span>
            )}
          </div>
          {trip.customerName && (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '4px 0 0' }}>{trip.customerName}</p>
          )}
        </div>
      </div>

      {/* Trip Info Card */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ padding: '4px 20px 4px', borderBottom: '1px solid var(--border-1)' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Thông tin chuyến
          </span>
        </div>
        <div style={{ padding: '0 20px' }}>
          <div className="info-row">
            <span className="info-row__icon"><Truck size={16} /></span>
            <div className="info-row__body">
              <div className="info-row__label">Xe đầu kéo</div>
              <div className="info-row__value">{trip.truckPlate || '—'}</div>
            </div>
          </div>
          <div className="info-row">
            <span className="info-row__icon"><Calendar size={16} /></span>
            <div className="info-row__body">
              <div className="info-row__label">Ngày khởi hành</div>
              <div className="info-row__value">{formatDate(trip.departureDate)}</div>
            </div>
          </div>
          {trip.cargoTypeName && (
            <div className="info-row">
              <span className="info-row__icon"><MapPin size={16} /></span>
              <div className="info-row__body">
                <div className="info-row__label">Loại hàng</div>
                <div className="info-row__value">{trip.cargoTypeName}</div>
              </div>
            </div>
          )}
          {trip.customerReference && (
            <div className="info-row">
              <span className="info-row__icon"><Package size={16} /></span>
              <div className="info-row__body">
                <div className="info-row__label">Mã tham chiếu</div>
                <div className="info-row__value">{trip.customerReference}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Containers Section */}
      <div className="panel panel--solid" style={{ marginBottom: 16 }}>
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Số Container / Seal ({containers.length})
          </span>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => setShowContainerForm(!showContainerForm)}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={12} /> Thêm
          </button>
        </div>

        {showContainerForm && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormGroup label="Số container *" style={{ flex: 1, minWidth: 140 }}>
                <input
                  className="input"
                  value={containerForm.containerNumber}
                  onChange={e => setContainerForm(f => ({ ...f, containerNumber: e.target.value }))}
                  placeholder="MSKU 123456 7"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormGroup>
              <FormGroup label="Số seal" style={{ flex: 1, minWidth: 120 }}>
                <input
                  className="input"
                  value={containerForm.sealNumber}
                  onChange={e => setContainerForm(f => ({ ...f, sealNumber: e.target.value }))}
                  placeholder="SEAL-001"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormGroup>
              <FormGroup label="Ghi chú" style={{ flex: 2, minWidth: 140 }}>
                <input
                  className="input"
                  value={containerForm.notes}
                  onChange={e => setContainerForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ghi chú (tuỳ chọn)"
                />
              </FormGroup>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleAddContainer}
                disabled={createContainerMut.isPending || !containerForm.containerNumber.trim()}
              >
                {createContainerMut.isPending ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        )}

        {containers.length === 0 ? (
          <div style={{ padding: '16px 20px', color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>
            Chưa có số container/seal nào
          </div>
        ) : (
          <div style={{ padding: '4px 0' }}>
            {containers.map((c) => {
              const isActive = expenseForm.tripContainerId === String(c.id);
              return (
              <div
                key={c.id}
                className={isActive ? 'fwd-cont-row fwd-cont-row--active' : 'fwd-cont-row'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 20px', borderBottom: '1px solid var(--border-1)',
                  cursor: 'pointer',
                  background: isActive ? 'var(--brand-subtle, rgba(0,177,79,0.08))' : undefined,
                  boxShadow: isActive ? 'inset 3px 0 0 var(--brand)' : undefined,
                }}
                onClick={() => setExpenseForm(prev => ({ ...prev, tripContainerId: String(c.id) }))}
                title="Chọn container này cho chi phí"
              >
                <Package size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-mono)' }}>{c.containerNumber}</span>
                  {c.sealNumber && (
                    <span style={{ color: 'var(--fg-3)', fontSize: 12, marginLeft: 12 }}>
                      Seal: <span style={{ fontFamily: 'var(--font-mono)' }}>{c.sealNumber}</span>
                    </span>
                  )}
                </div>
                {c.notes && (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.notes}</span>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="panel panel--solid" style={{ marginBottom: 16 }}>
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Chi phí phát sinh ({expenses.length})
          </span>
          <button
            className="btn btn--secondary btn--sm"
            onClick={openExpenseForm}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={12} /> Thêm
          </button>
        </div>

        {showExpenseForm && (
          <div className="fwd-expense-form">
            {/* Row 1: type + amounts + settlement */}
            <div className="fwd-expense-grid fwd-expense-grid--primary">
              <FormGroup label="Loại chi phí">
                <select
                  className="input"
                  value={expenseForm.expenseType}
                  onChange={e => handleExpenseTypeChange(e.target.value)}
                >
                  {Object.entries(FORWARDER_EXPENSE_TYPE_DEFAULTS).map(([code, cfg]) => (
                    <option key={code} value={code}>{cfg.name}</option>
                  ))}
                </select>
              </FormGroup>

              <FormGroup
                label="Giá mua vào (VNĐ) *"
              >
                <input
                  className={`input${expenseErrors.buyAmount ? ' input--error' : ''}`}
                  type="number"
                  value={expenseForm.buyAmount}
                  onChange={e => handleBuyAmountChange(e.target.value)}
                  placeholder="0"
                  min="1"
                />
                {expenseErrors.buyAmount && (
                  <span style={{ fontSize: 11, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                    {expenseErrors.buyAmount}
                  </span>
                )}
              </FormGroup>

              <FormGroup
                label="Giá bán ra (VNĐ)"
              >
                <input
                  className="input"
                  type="number"
                  value={expenseForm.sellAmount}
                  onChange={e => setExpenseForm(f => ({ ...f, sellAmount: e.target.value }))}
                  placeholder="0"
                  min="0"
                  readOnly={!FORWARDER_EXPENSE_TYPE_DEFAULTS[expenseForm.expenseType]?.defaultMarkup}
                  style={
                    !FORWARDER_EXPENSE_TYPE_DEFAULTS[expenseForm.expenseType]?.defaultMarkup
                      ? { background: 'var(--bg-3)', color: 'var(--fg-3)' }
                      : undefined
                  }
                />
              </FormGroup>

              <FormGroup label="Hình thức chi">
                <select
                  className="input"
                  value={expenseForm.settlementMethod}
                  onChange={e => {
                    const v = e.target.value as 'FORWARDER_ADVANCE' | 'COMPANY_DIRECT';
                    setExpenseForm(f => ({ ...f, settlementMethod: v, supplierId: v === 'FORWARDER_ADVANCE' ? '' : f.supplierId }));
                    if (expenseErrors.supplierId) setExpenseErrors(e => ({ ...e, supplierId: undefined }));
                  }}
                >
                  <option value="FORWARDER_ADVANCE">Chi hộ tạm ứng</option>
                  <option value="COMPANY_DIRECT">Công ty trả trực tiếp</option>
                </select>
              </FormGroup>
            </div>

            {/* Row 2: supplier (when company-direct) + container number */}
            <div className="fwd-expense-grid fwd-expense-grid--context">
              {expenseForm.settlementMethod === 'COMPANY_DIRECT' && (
                <FormGroup label="Nhà cung cấp *">
                  <select
                    className={`input${expenseErrors.supplierId ? ' input--error' : ''}`}
                    value={expenseForm.supplierId}
                    onChange={e => {
                      setExpenseForm(f => ({ ...f, supplierId: e.target.value }));
                      if (expenseErrors.supplierId) setExpenseErrors(err => ({ ...err, supplierId: undefined }));
                    }}
                  >
                    <option value="">-- Chọn NCC --</option>
                    {supplierOptions.map(s => (
                      <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                  </select>
                  {expenseErrors.supplierId && (
                    <span style={{ fontSize: 11, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                      {expenseErrors.supplierId}
                    </span>
                  )}
                </FormGroup>
              )}

              {containers.length === 0 && (
                <div className="fwd-expense-empty-container">
                  Chưa có container; chi phí này sẽ lưu như chi phí chung của chuyến.
                </div>
              )}

              {containers.length === 1 && selectedExpenseContainer && (
                <FormGroup label="Container áp dụng">
                  <div
                    className="input"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      background: 'var(--brand-subtle, rgba(0,177,79,0.08))',
                      borderColor: 'rgba(0, 107, 63, 0.22)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{selectedExpenseContainer.containerNumber}</span>
                    {selectedExpenseContainer.sealNumber && (
                      <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>Seal {selectedExpenseContainer.sealNumber}</span>
                    )}
                  </div>
                </FormGroup>
              )}

              {containers.length > 1 && (
                <FormGroup label="Container áp dụng">
                  <select
                    className="input"
                    value={expenseForm.tripContainerId}
                    onChange={e => setExpenseForm(f => ({ ...f, tripContainerId: e.target.value }))}
                  >
                    <option value="">Chi phí chung của chuyến</option>
                    {containers.map(c => (
                      <option key={c.id} value={String(c.id)}>
                        {c.containerNumber}{c.sealNumber ? ` · Seal ${c.sealNumber}` : ''}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', marginTop: 4 }}>
                    Chọn container từ danh sách đã nhập, không cần gõ lại số container.
                  </span>
                </FormGroup>
              )}
            </div>

            {/* Row 3: invoice + declaration + note */}
            <div className="fwd-expense-grid fwd-expense-grid--invoice">
              {expenseForm.expenseType !== 'INFRASTRUCTURE' && (
                <>
                  <FormGroup label="Số hóa đơn">
                    <input
                      className="input"
                      value={expenseForm.invoiceNumber}
                      onChange={e => setExpenseForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                      placeholder="Số hóa đơn"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </FormGroup>
                  <FormGroup label="Ngày hóa đơn">
                    <input
                      className="input"
                      type="date"
                      value={expenseForm.invoiceDate}
                      onChange={e => setExpenseForm(f => ({ ...f, invoiceDate: e.target.value }))}
                    />
                  </FormGroup>
                </>
              )}

              {expenseForm.expenseType === 'CUSTOMS' && (
                <FormGroup label="Số tờ khai hải quan *">
                  <input
                    className={`input${expenseErrors.declarationNumber ? ' input--error' : ''}`}
                    value={expenseForm.declarationNumber}
                    onChange={e => {
                      setExpenseForm(f => ({ ...f, declarationNumber: e.target.value }));
                      if (expenseErrors.declarationNumber) setExpenseErrors(err => ({ ...err, declarationNumber: undefined }));
                    }}
                    placeholder="Số tờ khai"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  />
                  {expenseErrors.declarationNumber && (
                    <span style={{ fontSize: 11, color: 'var(--danger)', display: 'block', marginTop: 2 }}>
                      {expenseErrors.declarationNumber}
                    </span>
                  )}
                </FormGroup>
              )}

              <FormGroup label="Ghi chú">
                <input
                  className="input"
                  value={expenseForm.note}
                  onChange={e => setExpenseForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú (tuỳ chọn)"
                />
              </FormGroup>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => { setShowExpenseForm(false); setExpenseErrors({}); }}
                disabled={createExpenseMut.isPending}
              >
                Hủy
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleAddExpense}
                disabled={createExpenseMut.isPending}
              >
                {createExpenseMut.isPending ? 'Đang lưu…' : 'Lưu chi phí'}
              </button>
            </div>
          </div>
        )}

        {expenses.length === 0 ? (
          <div style={{ padding: '16px 20px', color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>
            Chưa có chi phí phát sinh nào
          </div>
        ) : (
          <div style={{ padding: '4px 0' }}>
            {expenses.map((exp) => (
              <div key={exp.id} style={{ padding: '10px 20px', borderBottom: '1px solid var(--border-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <DollarSign size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                      {FORWARDER_EXPENSE_TYPE_DEFAULTS[exp.expenseType]?.name || forwarderExpenseTypeOptions.find(t => t.code === exp.expenseType)?.name || exp.expenseType}
                    </span>
                    {exp.approvalStatus === 'PENDING' && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: '#92400e', background: '#fef3c7',
                        borderRadius: 4, padding: '1px 6px', marginLeft: 6,
                      }}>Chờ duyệt</span>
                    )}
                    {exp.approvalStatus === 'REJECTED' && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: 'var(--danger)', background: 'rgba(220,38,38,0.1)',
                        borderRadius: 4, padding: '1px 6px', marginLeft: 6,
                      }}>Từ chối</span>
                    )}
                    {exp.note && (
                      <span style={{ color: 'var(--fg-3)', fontSize: 12, marginLeft: 8 }}>{exp.note}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(exp.buyAmount)}
                    </div>
                    {exp.settlementMethod === 'COMPANY_DIRECT' && (
                      <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Công ty trả</div>
                    )}
                  </div>
                  {/* Photo upload button */}
                  <label
                    className="icon-btn"
                    title="Thêm ảnh hóa đơn"
                    style={{ color: 'var(--fg-3)', opacity: 0.7, padding: 4, cursor: 'pointer' }}
                  >
                    {uploadingExpenseId === exp.id
                      ? <Loader2 size={14} className="spin" />
                      : <Camera size={14} />
                    }
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPhoto(exp.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    className="icon-btn"
                    onClick={() => handleDeleteExpense(exp.id)}
                    disabled={deleteExpenseMut.isPending}
                    title="Xóa chi phí"
                    style={{ color: 'var(--danger)', opacity: 0.6, padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {/* Photo thumbnails */}
                {expensePhotos[exp.id] && expensePhotos[exp.id].length > 0 && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, paddingLeft: 26 }}>
                    {expensePhotos[exp.id].map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={url}
                          alt={`Hóa đơn ${i + 1}`}
                          style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-1)' }}
                        />
                      </a>
                    ))}
                  </div>
                )}
                {/* Load photos on first render */}
                {!expensePhotos[exp.id] && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)', paddingLeft: 26, marginTop: 4, display: 'inline-block', cursor: 'pointer' }} onClick={() => loadExpensePhotos(exp.id)}>
                    Xem ảnh hóa đơn
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <TripLegsPanel legs={legs} />

      {/* Ghi chú */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ padding: '12px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Ghi chú
          </div>
          {trip.notes ? (
            <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: 0, lineHeight: 1.6 }}>{trip.notes}</p>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0, fontStyle: 'italic' }}>Không có ghi chú</p>
          )}
        </div>
      </div>

      {/* Liên hệ & hướng dẫn — manager-authored guidance for the field user */}
      {trip.instructions && (trip.instructions.contactName || trip.instructions.contactPhone || trip.instructions.notes) && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ padding: '12px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Liên hệ & hướng dẫn
            </div>
            {trip.instructions.contactName && (
              <div style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 }}>Liên hệ</span>
                <span style={{ color: 'var(--fg-1)', fontWeight: 500 }}>{trip.instructions.contactName}</span>
              </div>
            )}
            {trip.instructions.contactPhone && (
              <div style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.5, marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 60 }}>SĐT</span>
                <a href={`tel:${trip.instructions.contactPhone}`} style={{ color: 'var(--brand, #00B14F)', textDecoration: 'none', fontWeight: 500 }}>{trip.instructions.contactPhone}</a>
              </div>
            )}
            {trip.instructions.notes && (
              <p style={{ fontSize: 13, color: 'var(--fg-2)', margin: '8px 0 0', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{trip.instructions.notes}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
