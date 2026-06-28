import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Camera, ImageOff, X } from 'lucide-react';
import { api } from '../../lib/api';
import { photoSrc } from '../../lib/api/photo';
import { useToast } from '../shared/Toast';
import { qk } from '../../api/keys';
import { useCatalogs } from '../../hooks/useCatalogs';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import type { ContainerFormRow, SealFormRow } from '../../hooks/useTripFormState';
import { ContainerScanner, dataUrlToFile } from '../shared/ContainerScanner';
import { PhotoViewer } from '../PhotoViewer';
import './ContainerInstancesCard.css';
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
 * photos (fills the primary seal row). Tapping opens `ContainerScanner`; the
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
  /** Trip id. Omitted on the create page (/trips/new): the card then seeds
   *  empty rows and buffers captured photos in RAM until the trip is saved
   *  (flushed by `flushPendingContainerPhotos` after `POST /trips`). */
  tripId?: number;
  /** Expected container count from trip header (Số cont). New cards auto-fill
   *  enough rows to match — the user can still add/remove freely. */
  expectedCount?: number;
  /** When the cargo type requires cont/seal evidence, show a warning banner
   *  until at least one row has a cont or seal photo. */
  requiresPhotos?: boolean;
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

function photoStorageKey(value: string): string {
  const [path] = value.split('?');
  const marker = '/api/photos/';
  if (path.startsWith(marker)) return decodeURIComponent(path.slice(marker.length));
  return path;
}

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

export function ContainerInstancesCard({ tripId, expectedCount = 1, requiresPhotos }: Props) {
  const { toast } = useToast();
  const { data: catalogs } = useCatalogs();
  const containerTypes = catalogs?.containerTypes ?? [];
  // Rows live in the form state so the unified "Lưu cập nhật" submit persists
  // them; this card is the editor. `ocrResult` is the OCR broadcast channel.
  const { ocrResult, containerRows: rows, setContainerRows: setRows,
    uploadContainerPhoto, revokeRowPhotos, revokeContainerPhoto } = useTripFormContext();
  // Track whether we've seeded rows for this trip, to avoid clobbering local edits on refetch.
  const seededTripRef = useRef<number | null>(null);
  // Create-page (/trips/new) guard: seed initial empty rows exactly once,
  // since there is no server trip to seed from until the form is saved.
  const createSeededRef = useRef(false);

  // Per-container photo capture. `scanner` holds the row + type awaiting a
  // capture; `uploading` is keyed by row `_key` + cont/seal so each button
  // spins independently; `lightbox` is scoped per row + type so cont and
  // seal galleries don't cross-pollinate.
  const [scanner, setScanner] = useState<{ rowKey: string; type: 'CONTAINER' | 'SEAL' } | null>(null);
  const [uploading, setUploading] = useState<Record<string, { cont: boolean; seal: boolean }>>({});
  const [deletingPhotos, setDeletingPhotos] = useState<Record<string, { cont: boolean; seal: boolean }>>({});
  const [lightbox, setLightbox] = useState<{ rowKey: string; type: 'CONTAINER' | 'SEAL'; urls: string[]; index: number } | null>(null);

  // OCR results are broadcast from the side-panel photo uploader through the
  // trip-form context. Fill recognized container numbers into the first empty
  // cell and fill the primary seal number for a recognized seal. Each upload carries a fresh
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
      if (hasSeal) {
        const sn = ocrResult.sealNumber!;
        if (!next.length) next.push(emptyRow());
        const target = next[0];
        const primarySeal = target.seals[0] ?? emptySeal();
        target.seals = [{ ...primarySeal, sealNumber: sn.toUpperCase() }];
        target.sealNumber = sn.toUpperCase();
      }
      return next;
    });
    toast({ kind: 'info', message: 'Đã nhận diện số cont/seal — xem lại trước khi lưu.' });
  }, [ocrResult, setRows, toast]);

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
    // On the create page tripId is undefined; the query is disabled below, and
    // a sentinel key (0) keeps the helper's `number` signature satisfied.
    queryKey: qk.tripForm.tripContainers(tripId ?? 0),
    queryFn: () => api.get(`/trips/${tripId}/containers`),
    enabled: !!tripId,
  });

  // Seed the local rows from the server data once per trip. After the unified
  // save invalidates this query, `seededTripRef` is reset so the next refetch
  // re-seeds the saved rows.
  useEffect(() => {
    // Create page (/trips/new): no trip id yet. Seed `expectedCount` empty
    // rows once so the user has a starting row to fill; per-row cont/seal
    // photos buffer in RAM and flush after `POST /trips` + `saveContainers`.
    // Edit mode (tripId set) seeds from `existing` server data below.
    if (!tripId) {
      if (createSeededRef.current) return;
      createSeededRef.current = true;
      setRows(prev => prev.length > 0 ? prev : Array.from({ length: expectedCount }, () => emptyRow()));
      return;
    }
    if (!existing) return;
    if (seededTripRef.current === tripId) return;
    seededTripRef.current = tripId;
    const fromServer: ContainerRow[] = (existing.items || []).map((c) => {
      // The backend can carry multiple seals, but this editor intentionally
      // presents one primary seal per container to match the operational flow.
      let seals: SealFormRow[];
      if (c.seals && c.seals.length > 0) {
        const primarySeal = c.seals[0];
        seals = [{
          id: primarySeal.id,
          _key: sealKey(),
          sealNumber: primarySeal.sealNumber,
          sealType: primarySeal.sealType ?? '',
          notes: primarySeal.notes ?? '',
        }];
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

  useEffect(() => {
    if (!rows.some(r => r.seals.length > 1)) return;
    setRows(prev => prev.map(r => {
      if (r.seals.length <= 1) return r;
      const primarySeal = r.seals[0];
      return {
        ...r,
        seals: [{
          id: primarySeal.id,
          _key: primarySeal._key,
          sealNumber: primarySeal.sealNumber,
          sealType: primarySeal.sealType,
          notes: primarySeal.notes,
        }],
        sealNumber: primarySeal.sealNumber,
      };
    }));
  }, [rows, setRows]);

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

  const updatePrimarySeal = (
    rowKeyValue: string,
    field: 'sealNumber' | 'sealType' | 'notes',
    value: string,
  ) => {
    setRows(prev => prev.map(r => {
      if (r._key !== rowKeyValue) return r;
      const primarySeal = r.seals[0] ?? emptySeal();
      const seals = [{ ...primarySeal, [field]: value }];
      return { ...r, seals, sealNumber: field === 'sealNumber' ? value : seals[0].sealNumber };
    }));
  };

  const clearPrimarySeal = (rowKeyValue: string) => {
    setRows(prev => prev.map(r => (
      r._key === rowKeyValue ? { ...r, seals: [], sealNumber: '' } : r
    )));
  };

  const renderPhotoLane = (row: ContainerRow, pType: 'CONTAINER' | 'SEAL') => {
    const field = pType === 'CONTAINER' ? 'cont' : 'seal';
    const urls = row.photoKeys[field].slice(-1);
    const busy = (uploading[row._key]?.[field] ?? false) || (deletingPhotos[row._key]?.[field] ?? false);
    const isCont = pType === 'CONTAINER';
    return (
      <div className="ci-photo-lane">
        <div className="ci-photo-lane__head">
          <span className="ci-photo-lane__title">
            {isCont ? 'Ảnh container' : 'Ảnh seal'}
          </span>
          <button
            type="button"
            className="ci-photo-lane__capture"
            disabled={busy}
            onClick={() => setScanner({ rowKey: row._key, type: pType })}
            aria-label={isCont ? 'Chụp ảnh container' : 'Chụp ảnh seal'}
            title={isCont ? 'Chụp ảnh container' : 'Chụp ảnh seal'}
          >
            {busy ? <Loader2 size={13} className="spin" /> : <Camera size={13} />}
            <span>{urls.length > 0 ? 'Đổi ảnh' : (isCont ? 'Chụp cont' : 'Chụp seal')}</span>
          </button>
        </div>
        <div className="ci-photo-lane__drop" aria-busy={busy}>
          {urls.length === 0 ? (
            <button
              type="button"
              className="ci-photo-empty"
              disabled={busy}
              onClick={() => setScanner({ rowKey: row._key, type: pType })}
              aria-label={isCont ? 'Chụp ảnh container' : 'Chụp ảnh seal'}
            >
              <ImageOff size={16} />
              <span>Chưa có ảnh</span>
            </button>
          ) : (
            <>
              {urls.map((u, uIdx) => {
                const isPending = u.startsWith('blob:');
                return (
                  <span key={`${u}-${uIdx}`} className="ci-photo-slot">
                    <button
                      type="button"
                      className="ci-photo-slot__view"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        setLightbox({
                          rowKey: row._key,
                          type: pType,
                          urls: urls.map(photoSrc),
                          index: 0,
                        });
                      }}
                      aria-label={`Mở ảnh ${field} ${uIdx + 1}`}
                    >
                      <img
                        src={photoSrc(u)}
                        alt={`Ảnh ${field} ${uIdx + 1}`}
                      />
                    </button>
                    <button
                      type="button"
                      className="ci-photo-slot__remove"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation();
                        void removePhotoFromRow(row, pType, u);
                      }}
                      aria-label={isCont ? 'Xoá ảnh container' : 'Xoá ảnh seal'}
                      title={isCont ? 'Xoá ảnh container' : 'Xoá ảnh seal'}
                    >
                      {deletingPhotos[row._key]?.[field] ? <Loader2 size={11} className="spin" /> : <X size={11} />}
                    </button>
                    {isPending && (
                      <span className="ci-photo-slot__pending" title="Chưa lưu — sẽ tải lên khi bấm Lưu cập nhật">
                        chưa lưu
                      </span>
                    )}
                  </span>
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  };

  const deletePersistedPhoto = async (
    row: ContainerRow,
    type: 'CONTAINER' | 'SEAL',
    url: string,
  ) => {
    if (!tripId || !row.id || url.startsWith('blob:')) return;
    const res = await api.post<{ ok: boolean; removed?: number }>(
      `/upload/trips/${tripId}/photos/${type.toLowerCase()}/delete`,
      { container_id: row.id, storage_key: photoStorageKey(url) },
    );
    // removed===0 = no matching row (already gone, or a storageKey/container
    // mismatch). Treat as failure so the caller keeps the thumbnail + toasts an
    // error instead of a false "Đã xoá ảnh" with the photo surviving server-side.
    if (!res?.removed) throw new Error('photo not found on server');
  };

  /** Scanner captured a frame → run OCR → fill the originating row + photo slot. */
  const handleCapture = async (dataUrl: string) => {
    const target = scanner;
    if (!target) return;
    const row = rows.find(r => r._key === target.rowKey);
    if (!row) { setScanner(null); return; }
    const field = target.type === 'CONTAINER' ? 'cont' : 'seal';
    const previousUrls = row.photoKeys[field];
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
      // Each lane is a single-photo slot. Capturing a new photo replaces the
      // old visible value, instead of looking like a multi-photo gallery.
      for (const oldUrl of previousUrls) {
        if (oldUrl.startsWith('blob:')) revokeContainerPhoto(row._key, target.type, oldUrl);
      }
      setRows(prev => prev.map(r => r._key === target.rowKey
        ? { ...r, photoKeys: { ...r.photoKeys, [field]: [url] } }
        : r));
      for (const oldUrl of previousUrls) {
        if (!oldUrl.startsWith('blob:')) {
          deletePersistedPhoto(row, target.type, oldUrl).catch(() => {
            toast({ kind: 'error', message: 'Ảnh cũ chưa xoá được — thử xoá lại nếu còn hiện.' });
          });
        }
      }
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
            const primarySeal = r.seals[0] ?? emptySeal();
            const sealNumber = sn.toUpperCase();
            return {
              ...r,
              seals: [{ ...primarySeal, sealNumber }],
              sealNumber,
            };
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

  const removePhotoFromRow = async (
    row: ContainerRow,
    type: 'CONTAINER' | 'SEAL',
    url: string,
  ) => {
    const field = type === 'CONTAINER' ? 'cont' : 'seal';
    const dropFromState = () => setRows(prev => prev.map(r => r._key === row._key
      ? { ...r, photoKeys: { ...r.photoKeys, [field]: r.photoKeys[field].filter(u => u !== url) } }
      : r));

    // Unsaved local preview — revoke + drop just this entry (no server call).
    if (url.startsWith('blob:')) {
      revokeContainerPhoto(row._key, type, url);
      dropFromState();
      return;
    }

    if (!tripId || !row.id) {
      toast({ kind: 'error', message: 'Ảnh đã lưu cần chuyến và cont đã lưu để xoá.' });
      return;
    }

    setDeletingPhotos(prev => ({
      ...prev,
      [row._key]: { ...(prev[row._key] ?? { cont: false, seal: false }), [field]: true },
    }));
    try {
      // Delete ONLY the clicked photo. The slot renders just the last entry
      // (slice(-1)); the old code cleared the whole field, destroying unseen
      // sibling photos on legacy multi-photo rows. Drop only `url` from state.
      await deletePersistedPhoto(row, type, url);
      dropFromState();
      toast({ kind: 'success', message: 'Đã xoá ảnh.' });
    } catch {
      toast({ kind: 'error', message: 'Không xoá được ảnh — thử lại.' });
    } finally {
      setDeletingPhotos(prev => ({
        ...prev,
        [row._key]: { ...(prev[row._key] ?? { cont: false, seal: false }), [field]: false },
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

  const hasAnyContainerPhoto = rows.some(
    r => r.photoKeys.cont.length > 0 || r.photoKeys.seal.length > 0,
  );
  const showRequiresWarning = !!requiresPhotos && !hasAnyContainerPhoto;

  return (
    <div>
      {showRequiresWarning && (
        <div style={{
          padding: '10px 14px',
          background: 'var(--warning-soft, #fff7e6)',
          color: 'var(--warning-text, #b7791f)',
          border: '1px solid rgba(217, 119, 6, 0.18)',
          borderRadius: 'var(--radius-md, 10px)',
          fontSize: 13,
          marginBottom: 12,
          fontWeight: 600,
          lineHeight: 1.4,
        }}>
          ⚠️ Loại hàng này yêu cầu đính kèm ảnh vỏ Container và Niêm phong (Seal) để hoàn thành chuyến đi.
        </div>
      )}
      {rows.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--fg-3)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/assets/illustrations/empty-matching.svg" alt="Empty" style={{ width: 120, height: 120, opacity: 0.8, marginBottom: 16 }} />
          <p style={{ margin: 0, fontWeight: 500 }}>Chưa có cont nào. Bấm "Thêm cont" để bắt đầu.</p>
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
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-2)' }}>Cont #{idx + 1}</div>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon btn--sm"
                  style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => removeRow(row._key)}
                  aria-label="Xoá dòng"
                  title="Xoá cont"
                >
                  <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                </button>
              </div>

              <div className="ci-row">
                <div>
                  <label className="ci-label">
                    Số container <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input
                    className="input ci-input-sm"
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
                        marginTop: 4,
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 4,
                        alignItems: 'center',
                        padding: '4px 6px',
                        background: 'var(--warn-soft, #fff7e6)',
                        color: 'var(--warn, #b7791f)',
                        borderRadius: 6,
                        fontSize: 13,
                      }}>
                        <span>⚠ {st.warning}</span>
                        {st.suggestion && (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            style={{ minHeight: 22, padding: '0 8px', fontSize: 12 }}
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
                  <label className="ci-label">
                    Loại container
                  </label>
                  <select
                    className="input ci-input-sm"
                    style={{ width: '100%' }}
                    value={row.containerTypeId}
                    onChange={e => updateRow(row._key, 'containerTypeId', e.target.value === '' ? '' : Number(e.target.value))}
                  >
                    <option value="">Chọn loại</option>
                    {containerTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name || type.code}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="ci-label">
                    Trọng lượng (kg)
                  </label>
                  <input
                    type="number"
                    className="input ci-input-sm"
                    style={{ width: '100%' }}
                    placeholder="VD: 24500"
                    value={row.cargoWeightKg}
                    onChange={e => updateRow(row._key, 'cargoWeightKg', e.target.value)}
                    min={0}
                    max={99999999.99}
                  />
                </div>
                <div>
                  <label className="ci-label">
                    Ghi chú
                  </label>
                  <input
                    className="input ci-input-sm"
                    style={{ width: '100%' }}
                    placeholder="Ghi chú cont (tuỳ chọn)"
                    value={row.notes}
                    onChange={e => updateRow(row._key, 'notes', e.target.value)}
                  />
                </div>
              </div>

              <div className="ci-evidence-stack">
                {renderPhotoLane(row, 'CONTAINER')}

                {/* One operational seal number per container. */}
                <div className="ci-seal-section">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-2)' }}>
                      Số seal
                    </span>
                  </div>
                  {(() => {
                    const primarySeal = row.seals[0];
                    const hasSealValue = !!(primarySeal?.sealNumber.trim() || primarySeal?.notes.trim());
                    return (
                      <div className="ci-seal-row">
                        <input
                          className="input ci-input-sm"
                          style={{ width: 180 }}
                          placeholder="Số seal"
                          value={primarySeal?.sealNumber ?? ''}
                          onChange={e => updatePrimarySeal(row._key, 'sealNumber', e.target.value.toUpperCase())}
                        />
                        <input
                          className="input ci-input-sm"
                          style={{ width: 180, flex: 1, minWidth: 120 }}
                          placeholder="Ghi chú (tuỳ chọn)"
                          value={primarySeal?.notes ?? ''}
                          onChange={e => updatePrimarySeal(row._key, 'notes', e.target.value)}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--icon btn--sm"
                          style={{ minWidth: 28, minHeight: 28, visibility: hasSealValue ? 'visible' : 'hidden' }}
                          onClick={() => clearPrimarySeal(row._key)}
                          aria-label="Xoá seal"
                          title="Xoá seal"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {renderPhotoLane(row, 'SEAL')}
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
        <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>
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
