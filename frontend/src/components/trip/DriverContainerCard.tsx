import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Loader2, Save, Package, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { configClient } from '../../api/configClient';
import { qk } from '../../api/keys';
import { useToast } from '../shared/Toast';
import {
  normalizeContainerNumber,
  validateContainerFormat,
  validateCheckDigit,
  suggestCorrections,
} from '@tingting/shared';

/**
 * Container & seal section for the driver trip-detail page.
 *
 * Unlike `ContainerInstancesCard` (back-office, lives inside the trip-form
 * context and batch-saves the whole list), this card is standalone: the driver
 * detail page is NOT wrapped in a TripFormProvider. The driver uploads a photo
 * of the container/seal, the server recognizes the numbers via OCR, the numbers
 * auto-fill an inline form for review/editing, and the driver confirms by
 * saving — one container at a time through `POST /driver/me/trips/:id/containers`.
 *
 * Numbers are NEVER auto-committed (locked design decision #1): the OCR result
 * only pre-fills the form; nothing reaches the DB until the driver taps Lưu.
 */

interface ExistingContainer {
  id: number;
  containerNumber: string;
  sealNumber: string | null;
  containerTypeName: string | null;
  containerTypeCode: string | null;
  cargoWeightKg: string | null;
}

interface ContainerType {
  id: number;
  code: string;
  name: string;
}

interface OcrResponse {
  ok: boolean;
  containerNumbers?: string[];
  sealNumber?: string | null;
  photoUrl?: string;
  error?: string | null;
}

interface Props {
  tripId: number;
  /** Existing containers for this trip (read-only display; refreshed by parent). */
  containers: ExistingContainer[];
  onSaved: () => void;
}

type CheckStatus = { warning: string | null; suggestion: string | null };

/** ISO 6346 check-digit validation + a 1-edit correction suggestion. Advisory
 *  only — the number is never auto-saved. */
function checkContainerNumber(cn: string): CheckStatus {
  const trimmed = cn.trim();
  if (!trimmed) return { warning: null, suggestion: null };
  const norm = normalizeContainerNumber(trimmed);
  if (!validateContainerFormat(norm)) {
    return { warning: 'Số cont sai định dạng (4 chữ cái + 7 số).', suggestion: null };
  }
  if (validateCheckDigit(norm)) return { warning: null, suggestion: null };
  const corrections = suggestCorrections(norm, 1);
  return { warning: 'Số cont sai chữ số kiểm tra — kiểm tra lại.', suggestion: corrections[0] ?? null };
}

export function DriverContainerCard({ tripId, containers, onSaved }: Props) {
  const { toast } = useToast();
  const [draft, setDraft] = useState({ containerNumber: '', sealNumber: '', containerTypeId: '' });
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: containerTypes = [] } = useQuery<ContainerType[]>({
    queryKey: qk.catalogs.containerTypes,
    queryFn: () => configClient.getContainerTypes(),
    staleTime: 5 * 60 * 1000,
  });

  const onPick = async (file: File | undefined, _type: 'CONTAINER' | 'SEAL') => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      // The OCR call returns both container numbers and a seal regardless of
      // which zone the photo came from; `type` only categorizes the saved photo.
      formData.append('type', _type);
      formData.append('trip_id', String(tripId));
      const result = await api.upload('/ocr', formData) as OcrResponse;

      const cn = result.containerNumbers?.[0];
      setDraft(prev => ({
        ...prev,
        containerNumber: cn ? cn.toUpperCase() : prev.containerNumber,
        sealNumber: result.sealNumber ? result.sealNumber.toUpperCase() : prev.sealNumber,
      }));
      if (result.photoUrl) setLastPhoto(result.photoUrl);

      if (result.error) {
        setError(result.error);
      } else if (cn || result.sealNumber) {
        toast({ kind: 'info', message: 'Đã nhận diện số — xem lại rồi bấm Lưu.' });
      } else {
        setError('Không thấy số cont/seal trên ảnh. Hãy nhập tay hoặc chụp lại.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi nhận diện ảnh.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!draft.containerNumber.trim()) {
      setError('Cần nhập số container.');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/driver/me/trips/${tripId}/containers`, {
        containerNumber: draft.containerNumber.trim().toUpperCase(),
        sealNumber: draft.sealNumber.trim() || null,
        containerTypeId: draft.containerTypeId ? Number(draft.containerTypeId) : null,
      });
      setDraft({ containerNumber: '', sealNumber: '', containerTypeId: '' });
      setLastPhoto(null);
      toast({ kind: 'success', message: 'Đã lưu số cont.' });
      onSaved(); // parent refetches trip detail → list refreshes with the new row
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi lưu số cont.');
    } finally {
      setSaving(false);
    }
  };

  const check = checkContainerNumber(draft.containerNumber);

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel__head">
        <Package size={16} style={{ color: 'var(--ink-3)' }} />
        <span className="panel__head-title">
          Số cont & seal
        </span>
      </div>
      <div className="panel__body">
        {/* Existing containers (read-only) */}
        {containers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
            {containers.map(c => (
              <div key={c.id} style={{
                border: '1px solid var(--line)',
                borderRadius: 10,
                padding: '10px 12px',
                background: 'var(--surface-2)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: 14, letterSpacing: '0.04em', color: 'var(--ink)' }}>
                    {c.containerNumber}
                  </strong>
                  {c.containerTypeName && (
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      {c.containerTypeName}{c.containerTypeCode ? ` (${c.containerTypeCode})` : ''}
                    </span>
                  )}
                </div>
                {(c.sealNumber || c.cargoWeightKg) && (
                  <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink-3)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {c.sealNumber && <span>Seal: {c.sealNumber}</span>}
                    {c.cargoWeightKg && <span>{Number(c.cargoWeightKg).toLocaleString('vi-VN')} kg</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Inline entry form — pre-filled by OCR, confirmed by the driver */}
        {error && (
          <div style={{
            marginBottom: 10, padding: '8px 10px', fontSize: 12,
            background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* Upload zones — camera capture on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <label className="btn btn--secondary btn--sm" style={{ justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer' }}>
            <Camera size={14} /> {uploading ? <Loader2 size={14} className="spin" /> : 'Ảnh cont'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={uploading}
              onChange={e => onPick(e.target.files?.[0], 'CONTAINER')}
            />
          </label>
          <label className="btn btn--secondary btn--sm" style={{ justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer' }}>
            <Camera size={14} /> {uploading ? <Loader2 size={14} className="spin" /> : 'Ảnh seal'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              disabled={uploading}
              onChange={e => onPick(e.target.files?.[0], 'SEAL')}
            />
          </label>
        </div>

        {lastPhoto && (
          <img src={lastPhoto} alt="Ảnh vừa chụp" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
              Số container <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="VD: TCKU1234567"
              value={draft.containerNumber}
              onChange={e => setDraft(prev => ({ ...prev, containerNumber: e.target.value.toUpperCase() }))}
            />
            {check.warning && (
              <div style={{
                marginTop: 6, padding: '6px 8px', fontSize: 12,
                background: 'var(--warning-soft)', color: 'var(--warning)',
                borderRadius: 6, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
              }}>
                <span>⚠ {check.warning}</span>
                {check.suggestion && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ minHeight: 26, padding: '0 10px', fontSize: 12 }}
                    onClick={() => setDraft(prev => ({ ...prev, containerNumber: check.suggestion! }))}
                  >
                    Đổi thành {check.suggestion}
                  </button>
                )}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
              Số seal
            </label>
            <input
              className="input"
              style={{ width: '100%' }}
              placeholder="VD: AB123456"
              value={draft.sealNumber}
              onChange={e => setDraft(prev => ({ ...prev, sealNumber: e.target.value.toUpperCase() }))}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
              Loại cont
            </label>
            <select
              className="input"
              style={{ width: '100%' }}
              value={draft.containerTypeId}
              onChange={e => setDraft(prev => ({ ...prev, containerTypeId: e.target.value }))}
            >
              <option value="">— Chọn loại —</option>
              {containerTypes.map(ct => (
                <option key={ct.id} value={ct.id}>{ct.name} ({ct.code})</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || uploading}
            style={{ height: 40, padding: '0 16px' }}
          >
            {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Chụp/tải ảnh vỏ cont hoặc seal — app tự nhận diện số. Hãy kiểm tra lại rồi bấm Lưu.
        </p>
      </div>
    </div>
  );
}
