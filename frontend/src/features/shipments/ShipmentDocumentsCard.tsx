/**
 * Chứng từ card — lô documents: B/L, C/O, kiểm dịch, hun trùng, tờ khai…
 * Upload = label + hidden file input (ImagesNotesCard pattern); files stored
 * as uploaded (PDF/images never re-encoded). Download streams the original
 * bytes back with its stored fileName. Delete is write-role gated.
 */
import { useRef, useState } from 'react';
import { Download, FileText, Loader2, Paperclip, Trash2 } from 'lucide-react';
import { SHIPMENT_DOC_TYPE_LABELS, ShipmentDocType } from '@tingting/shared';
import type { Role, ShipmentDocument } from '@tingting/shared';
import { useToast } from '../../components/shared/Toast';
import { downloadBlob } from '../../lib/download';
import { formatErrorMessage } from '../../lib/api';
import { formatDateTimeVN } from '../../lib/format';
import {
  useDeleteShipmentDocument,
  useUploadShipmentDocument,
} from '../../hooks/useShipmentQueries';
import { shipmentClient } from '../../api/shipmentClient';
import { canWriteShipments, formatFileSize } from './shipmentDisplay';
import './shipment-cards.css';

const ACCEPTED_DOC_TYPES = '.pdf,.jpg,.jpeg,.png,.webp';

interface Props {
  shipmentId: number;
  documents: ShipmentDocument[];
  userRole: Role | null | undefined;
}

export default function ShipmentDocumentsCard({ shipmentId, documents, userRole }: Props) {
  const { toast } = useToast();
  const canWrite = canWriteShipments(userRole);
  const uploadMutation = useUploadShipmentDocument(shipmentId);
  const deleteMutation = useDeleteShipmentDocument(shipmentId);

  const [docType, setDocType] = useState<ShipmentDocType>(ShipmentDocType.BOOKING);
  const [note, setNote] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploading = uploadMutation.isPending;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failure
    if (!file) return;
    try {
      await uploadMutation.mutateAsync({
        file,
        input: { docType, note: note.trim() || undefined },
      });
      toast({ kind: 'success', message: 'Đã tải lên chứng từ.' });
      setNote('');
    } catch (err) {
      toast({ kind: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleDownload = async (doc: ShipmentDocument) => {
    try {
      const blob = await shipmentClient.documentFile(shipmentId, doc.id);
      downloadBlob(blob, doc.fileName);
    } catch (err) {
      toast({ kind: 'error', message: formatErrorMessage(err) });
    }
  };

  const handleDelete = async (doc: ShipmentDocument) => {
    if (!window.confirm(`Xóa chứng từ "${doc.fileName}"?`)) return;
    try {
      await deleteMutation.mutateAsync(doc.id);
      toast({ kind: 'success', message: 'Đã xóa chứng từ.' });
    } catch (err) {
      toast({ kind: 'error', message: formatErrorMessage(err) });
    }
  };

  return (
    <section className="shipment-card" data-testid="shipment-documents">
      <div className="shipment-card__head">
        <Paperclip size={15} aria-hidden="true" />
        <span className="shipment-card__title">Chứng từ</span>
        <small className="shipment-card__count">{documents.length}</small>
      </div>

      {documents.length === 0 ? (
        <div className="shipment-card__empty">Chưa có chứng từ nào được tải lên.</div>
      ) : (
        <div className="shipment-docs-list">
          {documents.map(doc => (
            <div key={doc.id} className="shipment-docs-row">
              <FileText size={15} aria-hidden="true" style={{ flex: '0 0 auto', color: 'var(--fg-3)' }} />
              <div className="shipment-docs-row__main">
                <div className="shipment-docs-row__file">
                  <span className="shipment-docs-chip shipment-docs-chip--{doc.docType.toLowerCase()}">
                    {SHIPMENT_DOC_TYPE_LABELS[doc.docType]}
                  </span>
                  <span className="shipment-docs-row__name" title={doc.fileName}>{doc.fileName}</span>
                </div>
                <div className="shipment-docs-row__meta">
                  {formatFileSize(doc.fileSize)}
                  {doc.fileSize != null && ' · '}
                  {formatDateTimeVN(doc.createdAt)}
                  {doc.note && ` · ${doc.note}`}
                </div>
              </div>
              <div className="shipment-docs-row__actions">
                <button
                  className="btn btn--ghost btn--icon btn--sm"
                  title="Tải xuống"
                  aria-label={`Tải xuống ${doc.fileName}`}
                  onClick={() => void handleDownload(doc)}
                  type="button"
                >
                  <Download size={14} />
                </button>
                {canWrite && (
                  <button
                    className="btn btn--ghost btn--icon btn--sm"
                    title="Xóa"
                    aria-label={`Xóa ${doc.fileName}`}
                    onClick={() => void handleDelete(doc)}
                    style={{ color: 'var(--danger)' }}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canWrite && (
        <div className="shipment-docs-upload">
          <div className="shipment-docs-upload__fields">
            <label className="shipment-docs-upload__label" htmlFor="shipment-doc-type">Loại</label>
            <select
              id="shipment-doc-type"
              className="input"
              value={docType}
              onChange={e => setDocType(e.target.value as ShipmentDocType)}
              disabled={uploading}
            >
              {(Object.keys(SHIPMENT_DOC_TYPE_LABELS) as ShipmentDocType[]).map(k => (
                <option key={k} value={k}>{SHIPMENT_DOC_TYPE_LABELS[k]}</option>
              ))}
            </select>
            <input
              className="input"
              placeholder="Ghi chú (tùy chọn)"
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={uploading}
              aria-label="Ghi chú chứng từ"
            />
          </div>
          <label
            className={`shipment-docs-upload__zone${uploading ? ' shipment-docs-upload__zone--busy' : ''}`}
            style={{ cursor: uploading ? 'wait' : 'pointer' }}
          >
            {uploading ? (
              <span className="shipment-docs-upload__busy">
                <Loader2 size={16} className="shipment-docs-upload__spin" aria-hidden="true" />
                Đang tải lên…
              </span>
            ) : (
              <>
                <div className="shipment-docs-upload__main">Chọn tệp để tải lên</div>
                <div className="shipment-docs-upload__sub">PDF, JPG, PNG, WEBP — lưu nguyên gốc</div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_DOC_TYPES}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </section>
  );
}
