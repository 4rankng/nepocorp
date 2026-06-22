import { useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Download, Pencil, Trash2, Receipt } from 'lucide-react';
import { useToast } from '../shared/Toast';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { financialClient } from '../../api/financialClient';
import BillingDocumentBuilder from './BillingDocumentBuilder';
import type {
  BillingDocument, BillingDocumentType, BillingDocumentEntityType,
} from '@tingting/shared';

interface Props {
  type: BillingDocumentType;
  entityType: BillingDocumentEntityType;
  entityId: number;
  entityName: string;
  /** Create-button label, e.g. "Tạo giấy báo nợ". */
  buttonLabel: string;
}

export default function BillingDocumentsPanel({ type, entityType, entityId, entityName, buttonLabel }: Props) {
  const { toast: showToast } = useToast();
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<BillingDocument | null>(null);

  const queryKey = ['billing-docs', type, entityType, entityId];
  const { data: docs = [] } = useQuery<BillingDocument[]>({
    queryKey,
    queryFn: () => financialClient.listBillingDocuments(entityType, entityId, type),
    enabled: !!entityId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const openNew = () => { setEditing(null); setBuilderOpen(true); };
  const openEdit = (doc: BillingDocument) => { setEditing(doc); setBuilderOpen(true); };

  const exportDoc = async (doc: BillingDocument) => {
    try {
      const blob = await api.getBlob(financialClient.getBillingDocumentExportUrl(doc.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'DEBIT_NOTE' ? 'giay-bao-no' : 'bang-ke-thanh-toan'}-${entityName}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xuất Excel' });
    }
  };

  const removeDoc = async (doc: BillingDocument) => {
    if (!window.confirm('Xóa tài liệu này?')) return;
    try {
      await financialClient.deleteBillingDocument(doc.id);
      showToast({ kind: 'success', message: 'Đã xóa.' });
      refresh();
    } catch (err) {
      showToast({ kind: 'error', message: (err as Error).message || 'Lỗi xóa' });
    }
  };

  return (
    <div className="billing-panel" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--fg-2)' }}>
          <Receipt size={14} /> {type === 'DEBIT_NOTE' ? 'Giấy báo nợ đã lưu' : 'Bảng kê thanh toán đã lưu'}
        </div>
        <button className="btn btn--secondary" onClick={openNew}>
          <Plus size={14} /> {buttonLabel}
        </button>
      </div>

      {docs.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--fg-3)', padding: '4px 0' }}>
          Chưa có tài liệu nào.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 12.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <FileText size={14} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                <span style={{ whiteSpace: 'nowrap' }}>{doc.rangeFrom} → {doc.rangeTo}</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {formatCurrency(doc.totalInclVat).replace(' ₫', '')}đ
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button className="btn-icon" title="Sửa" onClick={() => openEdit(doc)} style={iconBtn}>
                  <Pencil size={13} />
                </button>
                <button className="btn-icon" title="Xuất Excel" onClick={() => exportDoc(doc)} style={iconBtn}>
                  <Download size={13} />
                </button>
                <button className="btn-icon" title="Xóa" onClick={() => removeDoc(doc)} style={{ ...iconBtn, color: 'var(--danger)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {builderOpen && (
        <BillingDocumentBuilder
          isOpen={builderOpen}
          onClose={() => { setBuilderOpen(false); setEditing(null); }}
          type={type}
          entityType={entityType}
          entityId={entityId}
          entityName={entityName}
          initialDoc={editing}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

const iconBtn: CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', padding: 4, color: 'var(--fg-2)',
};
