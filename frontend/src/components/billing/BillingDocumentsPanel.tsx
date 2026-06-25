import { useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, FileText, Download, Pencil, Trash2, Receipt } from 'lucide-react';
import { useToast } from '../shared/Toast';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { financialClient } from '../../api/financialClient';
import BillingDocumentBuilder from './BillingDocumentBuilder';
import './BillingDocumentsPanel.css';
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
  createBuilderOpen?: boolean;
  onOpenCreate?: () => void;
  onBuilderClose?: () => void;
}

export default function BillingDocumentsPanel({
  type,
  entityType,
  entityId,
  entityName,
  buttonLabel,
  createBuilderOpen = false,
  onOpenCreate,
  onBuilderClose,
}: Props) {
  const { toast: showToast } = useToast();
  const queryClient = useQueryClient();
  const [localBuilderOpen, setLocalBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<BillingDocument | null>(null);

  const queryKey = ['billing-docs', type, entityType, entityId];
  const { data: docs = [] } = useQuery<BillingDocument[]>({
    queryKey,
    queryFn: () => financialClient.listBillingDocuments(entityType, entityId, type),
    enabled: !!entityId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const builderOpen = createBuilderOpen || localBuilderOpen;
  const openNew = () => {
    setEditing(null);
    if (onOpenCreate) {
      onOpenCreate();
    } else {
      setLocalBuilderOpen(true);
    }
  };
  const openEdit = (doc: BillingDocument) => { setEditing(doc); setLocalBuilderOpen(true); };
  const closeBuilder = () => {
    setLocalBuilderOpen(false);
    setEditing(null);
    if (createBuilderOpen) onBuilderClose?.();
  };

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
    <div className="billing-panel">
      <div className="billing-panel__head">
        <div className="billing-panel__title">
          <Receipt size={15} />
          <span>{type === 'DEBIT_NOTE' ? 'Giấy báo nợ đã lưu' : 'Bảng kê thanh toán đã lưu'}</span>
          <small>{docs.length > 0 ? `${docs.length} tài liệu` : 'Chưa có tài liệu'}</small>
        </div>
        <button className="btn btn--secondary billing-panel__create" onClick={openNew}>
          <Plus size={14} /> {buttonLabel}
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="billing-panel__empty">
          Chưa có tài liệu nào.
        </div>
      ) : (
        <div className="billing-panel__list">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="billing-panel__row"
            >
              <div className="billing-panel__doc">
                <FileText size={15} />
                <span>{doc.rangeFrom} → {doc.rangeTo}</span>
                <strong className="mono">
                  {formatCurrency(doc.totalInclVat).replace(' ₫', '')}đ
                </strong>
              </div>
              <div className="billing-panel__actions">
                <button className="btn-icon" title="Sửa" aria-label="Sửa" onClick={() => openEdit(doc)} style={iconBtn}>
                  <Pencil size={13} />
                </button>
                <button className="btn-icon" title="Xuất Excel" aria-label="Xuất Excel" onClick={() => exportDoc(doc)} style={iconBtn}>
                  <Download size={13} />
                </button>
                <button className="btn-icon" title="Xóa" aria-label="Xóa" onClick={() => removeDoc(doc)} style={{ ...iconBtn, color: 'var(--danger)' }}>
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
          onClose={closeBuilder}
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
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 4, color: 'var(--fg-2)',
};
