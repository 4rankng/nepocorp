import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../lib/format';
import { api } from '../lib/api';
import { qk } from '../api/keys';

interface DebtOffsetModalProps {
  isOpen: boolean;
  customerId: number;
  supplierId: number;
  arBalance: number;
  apBalance: number;
  onClose: () => void;
}

export function DebtOffsetModal({
  isOpen,
  customerId,
  supplierId,
  arBalance,
  apBalance,
  onClose,
}: DebtOffsetModalProps) {
  const offsetAmount = Math.min(arBalance, apBalance);
  const [offsetDate, setOffsetDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [mutationError, setMutationError] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/finance/debt-offsets', { customerId, supplierId, offsetDate, note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.financial.debtOffsets(customerId) });
      queryClient.invalidateQueries({ queryKey: qk.financial.customerStatement(String(customerId)) });
      queryClient.invalidateQueries({ queryKey: qk.financial.supplierStatement(supplierId) });
      queryClient.invalidateQueries({ queryKey: qk.financial.customerAgingAll });
      onClose();
    },
    onError: (err: unknown) => {
      setMutationError((err as Error)?.message || 'Lỗi khi tạo yêu cầu đối trừ.');
    },
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 440, boxShadow: 'var(--sh-xl)' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Đối trừ công nợ</h2>

        {/* Balance summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--fg-3)' }}>Phải thu (KH)</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(arBalance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--fg-3)' }}>Phải trả (NCC)</span>
            <span style={{ fontWeight: 600 }}>{formatCurrency(apBalance)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
            <span style={{ fontWeight: 600 }}>Số tiền đối trừ</span>
            <span style={{ fontWeight: 700, fontSize: 17, color: offsetAmount > 0 ? 'var(--fg-1)' : 'var(--danger)' }}>
              {formatCurrency(offsetAmount)}
            </span>
          </div>
        </div>

        {/* Warning note */}
        <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', marginBottom: 16 }}>
          Sau khi tạo, Quản lý cần phê duyệt để chính thức ghi sổ cái.
        </div>

        {/* Error */}
        {mutationError && (
          <div style={{ fontSize: 12, color: 'var(--danger)', background: 'var(--danger-soft)', borderRadius: 6, padding: '8px 10px', marginBottom: 12 }}>
            {mutationError}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
              Ngày đối trừ
            </label>
            <input
              type="date"
              value={offsetDate}
              onChange={e => setOffsetDate(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="input"
              style={{ width: '100%', resize: 'vertical' }}
              placeholder="Không bắt buộc"
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            className="btn btn--ghost btn--sm"
            style={{ flex: 1 }}
          >
            Hủy
          </button>
          <button
            onClick={() => { setMutationError(''); createMutation.mutate(); }}
            disabled={createMutation.isPending || offsetAmount <= 0}
            className="btn btn--primary btn--sm"
            style={{ flex: 1, background: '#f97316', borderColor: '#f97316' }}
          >
            {createMutation.isPending ? 'Đang xử lý...' : 'Tạo yêu cầu đối trừ'}
          </button>
        </div>
      </div>
    </div>
  );
}
