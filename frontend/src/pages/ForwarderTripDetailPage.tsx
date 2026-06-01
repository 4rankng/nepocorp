import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, Calendar, MapPin, Package, Trash2, Loader2, AlertCircle, Plus, DollarSign } from 'lucide-react';
import { formatDate, formatCurrency } from '../lib/format';
import { TRIP_STATUS_LABELS, FORWARDER_EXPENSE_TYPE_LABELS, type TripStatus, type ForwarderExpenseType } from '@nepocorp/shared';
import { StatusPill, Panel, FormGroup } from '../components/UI';
import TripLegsPanel from '../components/trip/TripLegsPanel';
import { useForwarderTripDetail, useCreateForwarderContainer, useCreateForwarderExpense, useDeleteForwarderExpense } from '../hooks/useQueries';

function tripStatusVariant(status: TripStatus): 'neutral' | 'info' | 'warn' | 'success' | 'danger' {
  switch (status) {
    case 'IN_TRANSIT': return 'info';
    case 'COMPLETED': return 'warn';
    case 'LOCKED': return 'success';
    case 'CANCELED': return 'danger';
    default: return 'neutral';
  }
}

export default function ForwarderTripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tripId = parseInt(id || '0', 10);

  const { data: trip, isLoading: loading, error: queryError } = useForwarderTripDetail(tripId);

  const createContainerMut = useCreateForwarderContainer();
  const createExpenseMut = useCreateForwarderExpense();
  const deleteExpenseMut = useDeleteForwarderExpense();

  const [showContainerForm, setShowContainerForm] = useState(false);
  const [containerForm, setContainerForm] = useState({ containerNumber: '', sealNumber: '', notes: '' });

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState<{ expenseType: string; amount: string; note: string }>({
    expenseType: 'LIFTING',
    amount: '',
    note: '',
  });

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-3)' }}>
      <Loader2 size={24} className="spin" style={{ display: 'inline-block' }} />
      <p style={{ marginTop: 12 }}>Đang tải…</p>
    </div>
  );

  if (queryError || !trip) return (
    <div style={{ padding: 24 }}>
      <button className="btn btn--ghost" onClick={() => navigate('/my-forwarder-trips')} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
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
      { tripId, data: { containerNumber: containerForm.containerNumber, sealNumber: containerForm.sealNumber || undefined, notes: containerForm.notes || undefined } },
      { onSuccess: () => { setContainerForm({ containerNumber: '', sealNumber: '', notes: '' }); setShowContainerForm(false); } },
    );
  };

  const handleAddExpense = () => {
    const amount = parseFloat(expenseForm.amount);
    if (!amount || amount <= 0) return;
    createExpenseMut.mutate(
      { tripId, expenseType: expenseForm.expenseType, amount, note: expenseForm.note || undefined },
      { onSuccess: () => { setExpenseForm({ expenseType: 'LIFTING', amount: '', note: '' }); setShowExpenseForm(false); } },
    );
  };

  const handleDeleteExpense = (expenseId: number) => {
    deleteExpenseMut.mutate({ id: expenseId, tripId });
  };

  const containers: any[] = trip.containers || [];
  const expenses: any[] = trip.expenses || [];
  const legs: any[] = trip.legs || [];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 40 }}>
      {/* Back button + Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 8px' }}>
        <button
          className="btn btn--ghost btn--icon"
          onClick={() => navigate('/my-forwarder-trips')}
          aria-label="Quay lại"
          style={{ width: 40, height: 40, borderRadius: '50%' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg-1)', margin: 0 }}>
              {trip.routeName || 'Chuyến đi'}
            </h1>
            <StatusPill variant={tripStatusVariant(trip.status)}>
              {TRIP_STATUS_LABELS[trip.status as TripStatus] || trip.status}
            </StatusPill>
            {trip.tripCode && (
              <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>#{trip.tripCode}</span>
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
      <div className="panel" style={{ marginBottom: 16 }}>
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
              <FormGroup label="Số container" style={{ flex: 1, minWidth: 140 }}>
                <input
                  className="input"
                  value={containerForm.containerNumber}
                  onChange={e => setContainerForm(f => ({ ...f, containerNumber: e.target.value }))}
                  placeholder="MSKU-123456"
                />
              </FormGroup>
              <FormGroup label="Số seal" style={{ flex: 1, minWidth: 120 }}>
                <input
                  className="input"
                  value={containerForm.sealNumber}
                  onChange={e => setContainerForm(f => ({ ...f, sealNumber: e.target.value }))}
                  placeholder="SEAL-001"
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
            {containers.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border-1)' }}>
                <Package size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{c.containerNumber}</span>
                  {c.sealNumber && (
                    <span style={{ color: 'var(--fg-3)', fontSize: 12, marginLeft: 12 }}>Seal: {c.sealNumber}</span>
                  )}
                </div>
                {c.notes && (
                  <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{c.notes}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expenses Section */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Chi phí phát sinh ({expenses.length})
          </span>
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Plus size={12} /> Thêm
          </button>
        </div>

        {showExpenseForm && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-1)', background: 'var(--bg-2)' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <FormGroup label="Loại chi phí" style={{ flex: 1, minWidth: 140 }}>
                <select
                  className="input"
                  value={expenseForm.expenseType}
                  onChange={e => setExpenseForm(f => ({ ...f, expenseType: e.target.value }))}
                >
                  {Object.entries(FORWARDER_EXPENSE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </FormGroup>
              <FormGroup label="Số tiền (VNĐ)" style={{ flex: 1, minWidth: 120 }}>
                <input
                  className="input"
                  type="number"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  min="0"
                />
              </FormGroup>
              <FormGroup label="Ghi chú" style={{ flex: 2, minWidth: 140 }}>
                <input
                  className="input"
                  value={expenseForm.note}
                  onChange={e => setExpenseForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Ghi chú (tuỳ chọn)"
                />
              </FormGroup>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleAddExpense}
                disabled={createExpenseMut.isPending || !expenseForm.amount || parseFloat(expenseForm.amount) <= 0}
              >
                {createExpenseMut.isPending ? 'Đang lưu…' : 'Lưu'}
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
            {expenses.map((exp: any) => (
              <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border-1)' }}>
                <DollarSign size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>
                    {FORWARDER_EXPENSE_TYPE_LABELS[exp.expenseType as ForwarderExpenseType] || exp.expenseType}
                  </span>
                  {exp.note && (
                    <span style={{ color: 'var(--fg-3)', fontSize: 12, marginLeft: 8 }}>{exp.note}</span>
                  )}
                </div>
                <span style={{ fontWeight: 600, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(exp.amount)}
                </span>
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
    </div>
  );
}
