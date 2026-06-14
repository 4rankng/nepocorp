import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Camera, ImageOff } from 'lucide-react';
import { api } from '../../lib/api';
import { photoSrc } from '../../lib/api/photo';
import { configClient } from '../../api/configClient';
import { useToast } from '../shared/Toast';
import { qk } from '../../api/keys';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import type { ContainerFormRow } from '../../hooks/useTripFormState';
import { ContainerScanner, dataUrlToFile } from '../shared/ContainerScanner';
import { PhotoViewer } from '../PhotoViewer';
import {
  normalizeContainerNumber,
  validateContainerFormat,
  validateCheckDigit,
  suggestCorrections,
} from '@tingting/shared';

/**
 * Card section embedded in `TripEditPage` / `TripCreatePage` that lets the
 * accountant or manager manage the per-container instances for a trip:
 * container number, seal number, container type, and cargo weight.
 *
 * The row state is owned by the form (`containerRows` in `useTripFormState`)
 * and saved by the unified "Lưu cập nhật" submit alongside the trip figures —
 * there is no separate "Lưu danh sách container" button anymore. (The old
 * standalone save desynced the trip `version` cache and caused false 409s on
 * the next figures save.) This card is purely the editor.
 *
 * Each container row also has a "Số cont" / "Số seal" photo capture button:
 * tapping it opens `ContainerScanner`, the captured frame is OCR'd via
 * `POST /api/ocr` (which persists the photo at trip level in `trip_photos`),
 * and the recognized number fills THAT row for review — mirroring the driver
 * flow in `DriverContainerCard`. Numbers are never auto-committed: the user
 * still presses "Lưu cập nhật" to persist them.
 */

interface ContainerType {
  id: number;
  code: string;
  name: string;
}

/** Edited container row. Aliased from the form-state type so this card and the
 *  unified "Lưu cập nhật" submit share one shape. */
type ContainerRow = ContainerFormRow;

/** Shape returned by `POST /api/ocr` (photo persist + Gemini recognition). */
interface OcrResponse {
  ok: boolean;
  containerNumbers?: string[];
  sealNumber?: string | null;
  photoUrl?: string;
  error?: string | null;
}

interface Props {
  tripId: number;
  /** Expected container count from trip header (Số cont). New cards auto-fill
   *  enough rows to match — the user can still add/remove freely. */
  expectedCount?: number;
}

function rowKey() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyRow(): ContainerRow {
  return {
    _key: rowKey(),
    containerTypeId: '',
    containerNumber: '',
    sealNumber: '',
    cargoWeightKg: '',
    notes: '',
  };
}

type ContainerCheckStatus = {
  warning: string | null;
  suggestion: string | null;
};

/**
 * Validate a container number against ISO 6346. Returns a Vietnamese warning
 * and, when a single 1-character correction would fix the check digit, the
 * suggested value so the user can apply it with one click. `null` warning
 * means the number looks fine (or the cell is empty). Catches both OCR
 * misreads and manual typos — the number is never auto-committed, so this is
 * advisory only.
 */
function checkContainerNumber(cn: string): ContainerCheckStatus {
  const trimmed = cn.trim();
  if (!trimmed) return { warning: null, suggestion: null };
  const norm = normalizeContainerNumber(trimmed);
  if (!validateContainerFormat(norm)) {
    return { warning: 'Số cont sai định dạng (4 chữ cái + 7 số).', suggestion: null };
  }
  if (validateCheckDigit(norm)) return { warning: null, suggestion: null };
  const corrections = suggestCorrections(norm, 1);
  return {
    warning: 'Số cont sai chữ số kiểm tra — kiểm tra lại.',
    suggestion: corrections[0] ?? null,
  };
}

export function ContainerInstancesCard({ tripId, expectedCount = 1 }: Props) {
  const { toast } = useToast();
  // Rows live in the form state so the unified "Lưu cập nhật" submit persists
  // them; this card is the editor. `ocrResult` is the OCR broadcast channel.
  const { ocrResult, containerRows: rows, setContainerRows: setRows } = useTripFormContext();
  // Track whether we've seeded rows for this trip, to avoid clobbering local edits on refetch.
  const seededTripRef = useRef<number | null>(null);

  // Per-container photo capture. `scanner` holds the row + type awaiting a
  // capture; `uploading` is keyed by row `_key` + cont/seal so each button
  // spins independently (a shared flag would spin every row — see S3251);
  // `thumbs` caches the latest captured/persisted photo URL per row + type.
  const [scanner, setScanner] = useState<{ rowKey: string; type: 'CONTAINER' | 'SEAL' } | null>(null);
  const [uploading, setUploading] = useState<Record<string, { cont: boolean; seal: boolean }>>({});
  const [thumbs, setThumbs] = useState<Record<string, { cont: string | null; seal: string | null }>>({});
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  // OCR results are broadcast from the photo uploader (container/seal zone)
  // through the trip-form context. Fill recognized numbers into the first
  // empty cell — never overwriting a value the user already entered. Each
  // upload carries a fresh `nonce`; the ref guard prevents double-filling
  // (incl. React 18 StrictMode's dev double-invoke).
  const consumedNonceRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!ocrResult) return;
    if (ocrResult.nonce === consumedNonceRef.current) return;
    consumedNonceRef.current = ocrResult.nonce;

    const hasContainers = ocrResult.containerNumbers.length > 0;
    const hasSeal = !!ocrResult.sealNumber;
    if (!hasContainers && !hasSeal) return;

    setRows(prev => {
      const next = prev.map(r => ({ ...r }));
      const fillEmpty = (field: 'containerNumber' | 'sealNumber', values: string[]) => {
        for (const value of values) {
          let slot = next.find(r => !r[field].trim());
          if (!slot) {
            slot = emptyRow();
            next.push(slot);
          }
          slot[field] = value;
        }
      };
      // Extraction is type-specific: a CONTAINER photo yields only container
      // numbers, a SEAL photo only the seal. Fill whichever the broadcast carries.
      fillEmpty('containerNumber', ocrResult.containerNumbers);
      if (hasSeal) fillEmpty('sealNumber', [ocrResult.sealNumber!]);
      return next;
    });
    toast({ kind: 'info', message: 'Đã nhận diện số cont/seal — xem lại trước khi lưu.' });
  }, [ocrResult, setRows, toast]);

  // Container types from the global config catalog
  const { data: containerTypes = [] } = useQuery<ContainerType[]>({
    queryKey: qk.catalogs.containerTypes,
    queryFn: () => configClient.getContainerTypes(),
    staleTime: 5 * 60 * 1000,
  });

  // Existing container instances for this trip. Also carries the trip's latest
  // cont/seal photo keys (trip-level storage) so persisted photos can render.
  const { data: existing, isLoading } = useQuery<{ items: any[]; contPhotoKey?: string | null; sealPhotoKey?: string | null }>({
    queryKey: qk.tripForm.tripContainers(tripId),
    queryFn: () => api.get(`/trips/${tripId}/containers`),
    enabled: !!tripId,
  });

  // Seed the local rows from the server data once per trip. After the unified
  // save invalidates this query, `seededTripRef` is reset (see handleSubmit in
  // useTripFormDispatch) so the next refetch re-seeds the saved rows.
  useEffect(() => {
    if (!existing) return;
    // Skip if we've already seeded for this trip and it hasn't changed.
    if (seededTripRef.current === tripId) return;
    seededTripRef.current = tripId;
    const fromServer: ContainerRow[] = (existing.items || []).map((c: any) => ({
      id: c.id,
      _key: rowKey(),
      containerTypeId: c.containerTypeId ?? '',
      containerNumber: c.containerNumber ?? '',
      sealNumber: c.sealNumber ?? '',
      cargoWeightKg: c.cargoWeightKg ?? '',
      notes: c.notes ?? '',
    }));
    // Top up empty rows to match the expected container count.
    while (fromServer.length < expectedCount) {
      fromServer.push(emptyRow());
    }
    setRows(fromServer);
    // Seed the trip's latest cont/seal photos onto the first row. Photos are
    // stored at trip level (trip_photos), so they belong to the whole trip;
    // row 1 is the natural home for the common single-container case.
    const firstKey = fromServer[0]?._key;
    if (firstKey) {
      setThumbs({ [firstKey]: { cont: existing.contPhotoKey ?? null, seal: existing.sealPhotoKey ?? null } });
    }
  }, [existing, expectedCount, tripId, setRows]);

  const updateRow = (key: string, field: keyof ContainerRow, value: string | number) => {
    setRows(prev => prev.map(r => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (key: string) => {
    setRows(prev => prev.filter(r => r._key !== key));
  };

  /** Scanner captured a frame → run OCR → fill the originating row + thumbnail. */
  const handleCapture = async (dataUrl: string) => {
    const target = scanner;
    if (!target) return;
    const field = target.type === 'CONTAINER' ? 'cont' : 'seal';
    // Close the camera overlay immediately; OCR runs in the background and
    // writes back into the row when it resolves.
    setScanner(null);
    setUploading(prev => ({
      ...prev,
      [target.rowKey]: { ...(prev[target.rowKey] ?? { cont: false, seal: false }), [field]: true },
    }));
    try {
      const formData = new FormData();
      formData.append('file', dataUrlToFile(dataUrl));
      formData.append('type', target.type);
      formData.append('trip_id', String(tripId));
      const result = await api.upload('/ocr', formData) as OcrResponse;
      if (target.type === 'CONTAINER') {
        const cn = result.containerNumbers?.[0];
        if (cn) updateRow(target.rowKey, 'containerNumber', cn.toUpperCase());
        toast({
          kind: cn ? 'info' : 'error',
          message: cn
            ? 'Đã nhận diện số cont — xem lại trước khi lưu.'
            : 'Không thấy số cont trong ảnh, nhập tay hoặc chụp lại.',
        });
      } else {
        const sn = result.sealNumber ?? null;
        if (sn) updateRow(target.rowKey, 'sealNumber', sn.toUpperCase());
        toast({
          kind: sn ? 'info' : 'error',
          message: sn
            ? 'Đã nhận diện số seal — xem lại trước khi lưu.'
            : 'Không thấy số seal trong ảnh, nhập tay hoặc chụp lại.',
        });
      }
      if (result.photoUrl) {
        setThumbs(prev => ({
          ...prev,
          [target.rowKey]: { ...(prev[target.rowKey] ?? { cont: null, seal: null }), [field]: result.photoUrl! },
        }));
      }
    } catch {
      toast({ kind: 'error', message: 'Lỗi tải ảnh lên — thử lại.' });
    } finally {
      setUploading(prev => ({
        ...prev,
        [target.rowKey]: { ...(prev[target.rowKey] ?? { cont: false, seal: false }), [field]: false },
      }));
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 16, color: 'var(--fg-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Loader2 size={16} className="spin" /> Đang tải container…
      </div>
    );
  }

  return (
    <div>
      {rows.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--fg-3)' }}>
          <p style={{ marginBottom: 12 }}>Chưa có cont nào. Bấm "Thêm cont" để bắt đầu.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row, idx) => (
            <div
              key={row._key}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 12,
                padding: 12,
                background: 'var(--bg-2, #fafafa)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-2)' }}>Cont #{idx + 1}</div>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  style={{ minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => removeRow(row._key)}
                  aria-label="Xoá dòng"
                  title="Xoá cont"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Số container <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VD: TCKU1234567"
                    value={row.containerNumber}
                    onChange={e => updateRow(row._key, 'containerNumber', e.target.value.toUpperCase())}
                  />
                  {(() => {
                    const st = checkContainerNumber(row.containerNumber);
                    if (!st.warning) return null;
                    return (
                      <div style={{
                        marginTop: 6,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 6,
                        alignItems: 'center',
                        padding: '6px 8px',
                        background: 'var(--warn-soft, #fff7e6)',
                        color: 'var(--warn, #b7791f)',
                        borderRadius: 6,
                        fontSize: 11,
                      }}>
                        <span>⚠ {st.warning}</span>
                        {st.suggestion && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            style={{ minHeight: 26, padding: '0 10px', fontSize: 11 }}
                            onClick={() => updateRow(row._key, 'containerNumber', st.suggestion!)}
                          >
                            Đổi thành {st.suggestion}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Số seal
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VD: AB123456"
                    value={row.sealNumber}
                    onChange={e => updateRow(row._key, 'sealNumber', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Loại cont
                  </label>
                  <select
                    className="input"
                    style={{ width: '100%' }}
                    value={row.containerTypeId}
                    onChange={e => updateRow(row._key, 'containerTypeId', e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">— Chọn loại —</option>
                    {containerTypes.map(ct => (
                      <option key={ct.id} value={ct.id}>{ct.name} ({ct.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Trọng lượng (kg)
                  </label>
                  <input
                    type="number"
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="VD: 24500"
                    value={row.cargoWeightKg}
                    onChange={e => updateRow(row._key, 'cargoWeightKg', e.target.value)}
                    min={0}
                    max={99999999.99}
                  />
                </div>
              </div>

              {/* Per-row photo capture: OCR a cont/seal photo and fill THIS row. */}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {(['CONTAINER', 'SEAL'] as const).map(pType => {
                  const field = pType === 'CONTAINER' ? 'cont' : 'seal';
                  const thumb = thumbs[row._key]?.[field] ?? null;
                  const busy = uploading[row._key]?.[field] ?? false;
                  return (
                    <div key={pType} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ minHeight: 34 }}
                        disabled={busy}
                        onClick={() => setScanner({ rowKey: row._key, type: pType })}
                      >
                        {busy ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
                        {pType === 'CONTAINER' ? 'Số cont' : 'Số seal'}
                      </button>
                      {thumb ? (
                        <img
                          src={photoSrc(thumb)}
                          alt={`Ảnh ${field}`}
                          onClick={() => setLightbox({ urls: [photoSrc(thumb)], index: 0 })}
                          style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', cursor: 'pointer', border: '1px solid var(--line)' }}
                        />
                      ) : (
                        <div
                          style={{ width: 40, height: 40, borderRadius: 6, border: '1px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-3)' }}
                          aria-label={`Chưa có ảnh ${field}`}
                        >
                          <ImageOff size={14} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={addRow}
        >
          <Plus size={14} /> Thêm cont
        </button>
        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
          Container lưu cùng nút "Lưu cập nhật" ở dưới.
        </span>
      </div>

      {scanner && (
        <ContainerScanner onCapture={handleCapture} onClose={() => setScanner(null)} />
      )}
      {lightbox && (
        <PhotoViewer
          urls={lightbox.urls}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
