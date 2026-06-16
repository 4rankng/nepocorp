import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Camera, ImageOff, X } from 'lucide-react';
import { api } from '../../lib/api';
import { photoSrc } from '../../lib/api/photo';
import { configClient } from '../../api/configClient';
import { useToast } from '../shared/Toast';
import { qk } from '../../api/keys';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import type { ContainerFormRow, SealFormRow } from '../../hooks/useTripFormState';
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
 * container number, a list of seals (customs, carrier, …), container type,
 * cargo weight, notes, and per-type photo galleries (cont / seal).
 *
 * The row state is owned by the form (`containerRows` in `useTripFormState`)
 * and saved by the unified "Lưu cập nhật" submit alongside the trip figures —
 * there is no separate "Lưu danh sách container" button anymore. (The old
 * standalone save desynced the trip `version` cache and caused false 409s on
 * the next figures save.) This card is purely the editor.
 *
 * Each container row has two "Số cont" / "Số seal" photo capture buttons: one
 * targets CONTAINER photos (fills `containerNumber`), the other targets SEAL
 * photos (appends a new seal sub-row). Tapping opens `ContainerScanner`; the
 * captured frame is OCR'd via `POST /api/ocr`. When both `trip_id` and
 * `container_id` are present (edit mode, saved row) the photo persists
 * directly. When the row has no id yet (create mode, or an unsaved new row)
 * the file is buffered in RAM and flushed after the unified save assigns ids.
 * Numbers are never auto-committed: the user still presses "Lưu cập nhật".
 *
 * The side-panel trip-level `ocrResult` broadcast (from the standalone photo
 * card) still fills the first empty containerNumber / appends a seal — kept
 * for parity with the driver flow.
 */

interface ContainerType {
  id: number;
  code: string;
  name: string;
}

/** Edited container row. Aliased from the form-state type so this card and the
 *  unified "Lưu cập nhật" submit share one shape. */
type ContainerRow = ContainerFormRow;

/** Container instance as returned by the trips API (Phase 2 includes
 *  `seals[]` and `photos[]` sub-collections). */
interface ServerContainer {
  id: number;
  containerTypeId?: number | null;
  containerNumber?: string | null;
  sealNumber?: string | null;
  cargoWeightKg?: string | number | null;
  notes?: string | null;
  seals?: Array<{ id: number; sealNumber: string; sealType?: string | null; notes?: string | null }>;
  photos?: Array<{ id: number; type: 'CONTAINER' | 'SEAL'; storageKey: string; uploadedAt: string }>;
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
    seals: [],
    photoKeys: { cont: [], seal: [] },
  };
}

function sealKey() {
  return Math.random().toString(36).slice(2, 9);
}

function emptySeal(): SealFormRow {
  return { _key: sealKey(), sealNumber: '', sealType: '', notes: '' };
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
  const { ocrResult, containerRows: rows, setContainerRows: setRows,
    uploadContainerPhoto, revokeRowPhotos } = useTripFormContext();
  // Track whether we've seeded rows for this trip, to avoid clobbering local edits on refetch.
  const seededTripRef = useRef<number | null>(null);

  // Per-container photo capture. `scanner` holds the row + type awaiting a
  // capture; `uploading` is keyed by row `_key` + cont/seal so each button
  // spins independently; `lightbox` is scoped per row + type so cont and
  // seal galleries don't cross-pollinate.
  const [scanner, setScanner] = useState<{ rowKey: string; type: 'CONTAINER' | 'SEAL' } | null>(null);
  const [uploading, setUploading] = useState<Record<string, { cont: boolean; seal: boolean }>>({});
  const [lightbox, setLightbox] = useState<{ rowKey: string; type: 'CONTAINER' | 'SEAL'; urls: string[]; index: number } | null>(null);

  // OCR results are broadcast from the side-panel photo uploader through the
  // trip-form context. Fill recognized container numbers into the first empty
  // cell and append a new seal for a recognized seal number — never
  // overwriting values the user already entered. Each upload carries a fresh
  // `nonce`; the ref guard prevents double-filling (incl. React 18
  // StrictMode's dev double-invoke).
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
      // Fill the first empty containerNumber cell for each recognized number;
      // if there are no rows or no empty slots, push a fresh row.
      for (const value of ocrResult.containerNumbers) {
        let slot = next.find(r => !r.containerNumber.trim());
        if (!slot) {
          slot = emptyRow();
          next.push(slot);
        }
        slot.containerNumber = value;
      }
      // Append a new seal sub-row to the first container (or push a new
      // container first) — deduped by case-insensitive seal number.
      if (hasSeal) {
        const sn = ocrResult.sealNumber!;
        if (!next.length) next.push(emptyRow());
        const target = next[0];
        const dupe = target.seals.some(sl => sl.sealNumber.trim().toUpperCase() === sn.toUpperCase());
        if (!dupe) {
          const newSeal = { ...emptySeal(), sealNumber: sn.toUpperCase() };
          target.seals = [...target.seals, newSeal];
          target.sealNumber = target.seals[0]?.sealNumber ?? '';
        }
      }
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

  // Existing container instances for this trip. Phase 2 also returns per-type
  // photo keys but we ignore the trip-level keys — photos now live in
  // `c.photos[]` and render from `row.photoKeys` once seeded.
  const { data: existing, isLoading } = useQuery<{
    items: ServerContainer[];
    contPhotoKey?: string | null;
    sealPhotoKey?: string | null;
    contPhotoKeys?: string[];
    sealPhotoKeys?: string[];
  }>({
    queryKey: qk.tripForm.tripContainers(tripId),
    queryFn: () => api.get(`/trips/${tripId}/containers`),
    enabled: !!tripId,
  });

  // Seed the local rows from the server data once per trip. After the unified
  // save invalidates this query, `seededTripRef` is reset so the next refetch
  // re-seeds the saved rows.
  useEffect(() => {
    if (!existing) return;
    if (seededTripRef.current === tripId) return;
    seededTripRef.current = tripId;
    const fromServer: ContainerRow[] = (existing.items || []).map((c) => {
      // Phase 2 server rows may carry `seals[]` (preferred) or a legacy
      // `sealNumber` scalar — migrate the scalar into a single seal so the
      // editor works the same for old + new data.
      let seals: SealFormRow[];
      if (c.seals && c.seals.length > 0) {
        seals = c.seals.map(sl => ({
          id: sl.id,
          _key: sealKey(),
          sealNumber: sl.sealNumber,
          sealType: sl.sealType ?? '',
          notes: sl.notes ?? '',
        }));
      } else if (c.sealNumber) {
        seals = [{ _key: sealKey(), sealNumber: c.sealNumber, sealType: '', notes: '' }];
      } else {
        seals = [];
      }
      const photos = c.photos ?? [];
      const photoKeys = {
        cont: photos.filter(p => p.type === 'CONTAINER').map(p => p.storageKey),
        seal: photos.filter(p => p.type === 'SEAL').map(p => p.storageKey),
      };
      return {
        id: c.id,
        _key: rowKey(),
        containerTypeId: c.containerTypeId ?? '',
        containerNumber: c.containerNumber ?? '',
        // Deprecated scalar — kept in sync with seals[0] for back-compat.
        sealNumber: seals[0]?.sealNumber ?? '',
        cargoWeightKg: c.cargoWeightKg != null ? String(c.cargoWeightKg) : '',
        notes: c.notes ?? '',
        seals,
        photoKeys,
      };
    });
    // Top up empty rows to match the expected container count.
    while (fromServer.length < expectedCount) {
      fromServer.push(emptyRow());
    }
    setRows(fromServer);
  }, [existing, expectedCount, tripId, setRows]);

  const updateRow = (key: string, field: keyof ContainerRow, value: string | number) => {
    setRows(prev => prev.map(r => (r._key === key ? { ...r, [field]: value } : r)));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (key: string) => {
    // Free any buffered blob: URLs for this row (they'd never resolve
    // because the row's id is going away).
    revokeRowPhotos(key);
    setRows(prev => prev.filter(r => r._key !== key));
  };

  const addSeal = (rowKeyValue: string) => {
    setRows(prev => prev.map(r => (
      r._key === rowKeyValue ? { ...r, seals: [...r.seals, emptySeal()] } : r
    )));
  };

  const updateSeal = (
    rowKeyValue: string,
    sealKeyValue: string,
    field: 'sealNumber' | 'sealType' | 'notes',
    value: string,
  ) => {
    setRows(prev => prev.map(r => {
      if (r._key !== rowKeyValue) return r;
      const seals = r.seals.map(sl => sl._key === sealKeyValue ? { ...sl, [field]: value } : sl);
      // Keep the deprecated sealNumber scalar synced to seals[0].
      return { ...r, seals, sealNumber: seals[0]?.sealNumber ?? '' };
    }));
  };

  const removeSeal = (rowKeyValue: string, sealKeyValue: string) => {
    setRows(prev => prev.map(r => {
      if (r._key !== rowKeyValue) return r;
      const seals = r.seals.filter(sl => sl._key !== sealKeyValue);
      return { ...r, seals, sealNumber: seals[0]?.sealNumber ?? '' };
    }));
  };

  /** Scanner captured a frame → run OCR → fill the originating row + photo gallery. */
  const handleCapture = async (dataUrl: string) => {
    const target = scanner;
    if (!target) return;
    const row = rows.find(r => r._key === target.rowKey);
    if (!row) { setScanner(null); return; }
    const field = target.type === 'CONTAINER' ? 'cont' : 'seal';
    // Close the camera overlay immediately; OCR runs in the background and
    // writes back into the row when it resolves.
    setScanner(null);
    setUploading(prev => ({
      ...prev,
      [target.rowKey]: { ...(prev[target.rowKey] ?? { cont: false, seal: false }), [field]: true },
    }));
    try {
      const file = dataUrlToFile(dataUrl);
      const { url, ocrResult: ocr, pending } = await uploadContainerPhoto(
        file, tripId, target.rowKey, target.type, row.id,
      );
      // Append the photo to this row's gallery (server URL or blob: preview).
      setRows(prev => prev.map(r => r._key === target.rowKey
        ? { ...r, photoKeys: { ...r.photoKeys, [field]: [...r.photoKeys[field], url] } }
        : r));
      // Row-scoped OCR fill.
      if (target.type === 'CONTAINER') {
        const cn = ocr.containerNumbers?.[0];
        if (cn) updateRow(target.rowKey, 'containerNumber', cn.toUpperCase());
        toast({
          kind: cn ? 'info' : 'error',
          message: cn
            ? 'Đã nhận diện số cont — xem lại trước khi lưu.'
            : 'Không thấy số cont trong ảnh, nhập tay hoặc chụp lại.',
        });
      } else {
        const sn = ocr.sealNumber ?? null;
        if (sn) {
          setRows(prev => prev.map(r => {
            if (r._key !== target.rowKey) return r;
            const dupe = r.seals.some(sl => sl.sealNumber.trim().toUpperCase() === sn.toUpperCase());
            if (dupe) return r;
            const newSeal = { ...emptySeal(), sealNumber: sn.toUpperCase() };
            const seals = [...r.seals, newSeal];
            return { ...r, seals, sealNumber: seals[0]?.sealNumber ?? '' };
          }));
        }
        toast({
          kind: sn ? 'info' : 'error',
          message: sn
            ? 'Đã nhận diện số seal — xem lại trước khi lưu.'
            : 'Không thấy số seal trong ảnh, nhập tay hoặc chụp lại.',
        });
      }
      if (ocr.error) toast({ kind: 'info', message: ocr.error });
      // `pending` is implicit: blob: URLs render with a "chưa lưu" badge.
      void pending;
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
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--fg-2)', marginBottom: 4 }}>
                    Ghi chú
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Ghi chú cont (tuỳ chọn)"
                    value={row.notes}
                    onChange={e => updateRow(row._key, 'notes', e.target.value)}
                  />
                </div>
              </div>

              {/* Per-type photo galleries (cont + seal) — each captures
                  against THIS row only (the originating row's id, when known). */}
              {(['CONTAINER', 'SEAL'] as const).map(pType => {
                const field = pType === 'CONTAINER' ? 'cont' : 'seal';
                const urls = row.photoKeys[field];
                const busy = uploading[row._key]?.[field] ?? false;
                return (
                  <div key={pType} style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-2)' }}>
                        {pType === 'CONTAINER' ? 'Ảnh cont' : 'Ảnh seal'} ({urls.length})
                      </span>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ minHeight: 30 }}
                        disabled={busy}
                        onClick={() => setScanner({ rowKey: row._key, type: pType })}
                      >
                        {busy ? <Loader2 size={14} className="spin" /> : <Camera size={14} />}
                        {pType === 'CONTAINER' ? 'Chụp cont' : 'Chụp seal'}
                      </button>
                    </div>
                    {urls.length === 0 ? (
                      <div
                        style={{
                          width: 44, height: 44, borderRadius: 6,
                          border: '1px dashed var(--line)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--fg-3)',
                        }}
                        aria-label={`Chưa có ảnh ${field}`}
                      >
                        <ImageOff size={14} />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {urls.map((u, uIdx) => {
                          const isPending = u.startsWith('blob:');
                          return (
                            <div key={`${u}-${uIdx}`} style={{ position: 'relative' }}>
                              <img
                                src={photoSrc(u)}
                                alt={`Ảnh ${field} ${uIdx + 1}`}
                                onClick={() => setLightbox({
                                  rowKey: row._key,
                                  type: pType,
                                  urls: row.photoKeys[field].map(photoSrc),
                                  index: uIdx,
                                })}
                                style={{
                                  width: 44, height: 44, borderRadius: 6, objectFit: 'cover',
                                  cursor: 'pointer', border: '1px solid var(--line)',
                                }}
                              />
                              {isPending && (
                                <span
                                  title="Chưa lưu — sẽ tải lên khi bấm Lưu cập nhật"
                                  style={{
                                    position: 'absolute', top: -4, right: -4,
                                    background: 'var(--warn, #b7791f)',
                                    color: '#fff',
                                    fontSize: 9, fontWeight: 600,
                                    padding: '1px 4px', borderRadius: 4,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  chưa lưu
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Seals sub-list: customs, carrier, … — multiple per container. */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-2)' }}>
                    Seal ({row.seals.length})
                  </span>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    style={{ minHeight: 30 }}
                    onClick={() => addSeal(row._key)}
                  >
                    <Plus size={14} /> Thêm seal
                  </button>
                </div>
                {row.seals.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>Chưa có seal nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {row.seals.map((sl, sIdx) => (
                      <div
                        key={sl._key}
                        style={{
                          display: 'flex', flexWrap: 'wrap', gap: 6,
                          alignItems: 'center',
                          padding: 6, borderRadius: 6,
                          border: '1px solid var(--line)',
                          background: 'var(--bg-1, #fff)',
                        }}
                      >
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', minWidth: 36 }}>
                          #{sIdx + 1}
                        </span>
                        <input
                          className="input"
                          style={{ width: 110 }}
                          list="seal-types"
                          placeholder="Loại seal"
                          value={sl.sealType}
                          onChange={e => updateSeal(row._key, sl._key, 'sealType', e.target.value)}
                        />
                        <input
                          className="input"
                          style={{ width: 160 }}
                          placeholder="Số seal"
                          value={sl.sealNumber}
                          onChange={e => updateSeal(row._key, sl._key, 'sealNumber', e.target.value.toUpperCase())}
                        />
                        <input
                          className="input"
                          style={{ width: 180, flex: 1, minWidth: 120 }}
                          placeholder="Ghi chú (tuỳ chọn)"
                          value={sl.notes}
                          onChange={e => updateSeal(row._key, sl._key, 'notes', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon btn--sm"
                          style={{ minWidth: 32, minHeight: 32 }}
                          onClick={() => removeSeal(row._key, sl._key)}
                          aria-label="Xoá seal"
                          title="Xoá seal"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Shared datalist for sealType — defined once at the bottom of the
          component tree so the per-row <input list="seal-types"> references
          resolve. Free-form; values are suggestions, not an enum. */}
      <datalist id="seal-types">
        <option value="Customs" />
        <option value="Carrier" />
        <option value="Truck" />
        <option value="Viettel" />
        <option value="Bản in" />
      </datalist>
    </div>
  );
}
