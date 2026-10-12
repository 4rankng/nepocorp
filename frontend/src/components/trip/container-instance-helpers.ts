import type { ContainerFormRow, SealFormRow } from '../../hooks/useTripFormState';
import { normalizeContainerNumber, validateContainerFormat, validateCheckDigit, suggestCorrections } from '@tingting/shared';

export type ContainerRow = ContainerFormRow;
export interface ServerContainer { id: number; clientKey?: string | null; containerTypeId?: number | null; containerNumber?: string | null; sealNumber?: string | null; cargoWeightKg?: string | number | null; notes?: string | null; seals?: Array<{ id: number; sealNumber: string; sealType?: string | null; notes?: string | null }>; photos?: Array<{ id: number; type: 'CONTAINER' | 'SEAL'; storageKey: string; uploadedAt: string }>; }
export function rowKey() { return Math.random().toString(36).slice(2, 9); }
export function emptyRow(containerTypeId: number | '' = ''): ContainerRow { return { _key: rowKey(), containerTypeId, containerNumber: '', sealNumber: '', cargoWeightKg: '', notes: '', seals: [], photoKeys: { cont: [], seal: [] } }; }
export function hasEditableContainerData(row: ContainerRow): boolean { return Boolean(row.containerNumber.trim() || row.containerTypeId || row.cargoWeightKg || row.notes.trim() || row.seals.some(sl => sl.sealNumber.trim() || sl.sealType.trim() || sl.notes.trim()) || row.photoKeys.cont.some(Boolean) || row.photoKeys.seal.some(Boolean)); }
export function sealKey() { return Math.random().toString(36).slice(2, 9); }
export function emptySeal(): SealFormRow { return { _key: sealKey(), sealNumber: '', sealType: '', notes: '' }; }
export function photoStorageKey(value: string): string { const [path] = value.split('?'); const marker = '/api/photos/'; return path.startsWith(marker) ? decodeURIComponent(path.slice(marker.length)) : path; }
export function checkContainerNumber(cn: string): { warning: string | null; suggestion: string | null } { const trimmed = cn.trim(); if (!trimmed) return { warning: null, suggestion: null }; const norm = normalizeContainerNumber(trimmed); if (!validateContainerFormat(norm)) return { warning: 'Số cont sai định dạng (4 chữ cái + 7 số).', suggestion: null }; if (validateCheckDigit(norm)) return { warning: null, suggestion: null }; return { warning: 'Số cont sai chữ số kiểm tra — kiểm tra lại.', suggestion: suggestCorrections(norm, 1)[0] ?? null }; }

export interface ContainerBatchPayloadItem {
  id?: number;
  /** The row's stable `_key`, echoed back on the saved item so the post-save
   *  rebind is exact. Never persisted server-side. */
  clientKey: string;
  /**
   * Present = set that type; explicit `null` = clear; absent = keep the stored type.
   * The API schema marks it optional, so omission is a real "do not touch"
   * signal (kanban 20260921_2).
   */
  containerTypeId?: number | null;
  containerNumber: string | null;
  cargoWeightKg: number | null;
  notes: string | null;
  seals: Array<{ id?: number; sealNumber: string; sealType: string | null; notes: string | null }>;
}

/**
 * Payload for `PUT /trips/:id/containers` (full reconcile).
 *
 * A persisted row (has `id`) with no container type omits `containerTypeId`
 * instead of sending `null`: the rows are seeded from the server, and a save that
 * only edits the container/seal numbers must not drop the type the planner chose.
 * Brand-new rows send `null` — there is nothing to preserve.
 */
export function buildContainerBatchPayload(rows: ContainerRow[]): ContainerBatchPayloadItem[] {
  // `seals[]` is the source of truth; the backend mirrors seals[0] into the
  // legacy scalar sealNumber.
  return rows.map((row) => {
    const item: ContainerBatchPayloadItem = {
      clientKey: row._key,
      containerNumber: row.containerNumber.trim() || null,
      cargoWeightKg: row.cargoWeightKg === '' ? null : Number(row.cargoWeightKg),
      notes: row.notes.trim() || null,
      seals: row.seals
        .filter((seal) => seal.sealNumber.trim())
        .map((seal) => ({
          id: seal.id,
          sealNumber: seal.sealNumber.trim(),
          sealType: seal.sealType.trim() || null,
          notes: seal.notes.trim() || null,
        })),
    };
    if (row.id !== undefined) item.id = row.id;
    if (row.containerTypeId !== '') item.containerTypeId = Number(row.containerTypeId);
    else if (row.id === undefined) item.containerTypeId = null;
    return item;
  });
}

/** Server photos → photo slots (oldest → newest): `seal[i]` is the photo for
 *  seal slot i; `cont`'s LAST entry is the row's current container photo. The
 *  server stores no slot information (trip_photos links to the container, not
 *  to a seal), so slot assignment for rows without pre-save state is
 *  capture-order — best-effort within the row; the photo's binding to its
 *  CONTAINER is exact either way. */
export function photoKeysFromServer(photos: ServerContainer['photos']): { cont: string[]; seal: string[] } {
  const asc = (photos ?? []).slice().sort((a, b) => (a.uploadedAt < b.uploadedAt ? -1 : a.uploadedAt > b.uploadedAt ? 1 : 0));
  return {
    cont: asc.filter((p) => p.type === 'CONTAINER').map((p) => p.storageKey),
    seal: asc.filter((p) => p.type === 'SEAL').map((p) => p.storageKey),
  };
}

/**
 * Map the batch-upsert response back onto the editor's pre-save rows.
 *
 * Binding is by STABLE IDENTITY only: the server-echoed `clientKey` first,
 * then the server `id`. Content/position matching ("first blank row", list
 * index) is exactly what bound one container's buffered photos to a different
 * container on prod trip TRP-202610-0029 — a pool row missing from the payload
 * (an empty padding row) could steal an item's identity and shift every match
 * after it. Never reintroduce content/position matching here.
 *
 * Returns:
 *   - `rows`: one row per saved item (server order), keeping the matched
 *     pre-save row's `_key`, seal slots, and photo slots intact.
 *   - `rowKeyToContainerId`: pre-save `_key` → saved container id, used to flush
 *     that row's buffered (`blob:`) photos to the RIGHT container.
 */
export function rebindSavedContainerRows(
  items: ServerContainer[],
  prevRows: ContainerRow[],
): { rows: ContainerRow[]; rowKeyToContainerId: Map<string, number> } {
  const prevByKey = new Map<string, ContainerRow>(prevRows.map((r) => [r._key, r]));
  const claimedKeys = new Set<string>();
  const rowKeyToContainerId = new Map<string, number>();

  const rows = items.map((c): ContainerRow => {
    const prev =
      (c.clientKey != null && !claimedKeys.has(c.clientKey) ? prevByKey.get(c.clientKey) : undefined)
      ?? prevRows.find((r) => !claimedKeys.has(r._key) && r.id === c.id);
    const _key = prev?._key ?? rowKey();
    if (prev) claimedKeys.add(_key);
    rowKeyToContainerId.set(_key, c.id);

    // Seals keep their slots: each pre-save slot is matched to its saved seal
    // row by id (persisted) or seal number (just-inserted), so slot i stays the
    // same seal — and keeps its photo (`photoKeys.seal[i]` belongs to `seals[i]`).
    const serverSeals = c.seals ?? [];
    const usedServerSeals = new Set<number>();
    const seals: SealFormRow[] = (prev?.seals ?? []).map((ps) => {
      const idx = serverSeals.findIndex((sl, i) =>
        !usedServerSeals.has(i) &&
        (ps.id !== undefined
          ? sl.id === ps.id
          : ps.sealNumber.trim() !== '' && sl.sealNumber.toUpperCase() === ps.sealNumber.trim().toUpperCase()),
      );
      if (idx === -1) return ps;
      usedServerSeals.add(idx);
      const sl = serverSeals[idx];
      return { id: sl.id, _key: ps._key, sealNumber: sl.sealNumber ?? '', sealType: sl.sealType ?? '', notes: sl.notes ?? '' };
    });
    for (let i = 0; i < serverSeals.length; i++) {
      if (usedServerSeals.has(i)) continue;
      const sl = serverSeals[i];
      seals.push({ id: sl.id, _key: sealKey(), sealNumber: sl.sealNumber ?? '', sealType: sl.sealType ?? '', notes: sl.notes ?? '' });
    }

    // Photos keep the pre-save row's slots — the row is the truth the user has
    // been editing all session (its persisted photos were captured against
    // these slots; its `blob:` previews are swapped to server URLs by the
    // flush). Only a row the client never sent (a concurrently-added container)
    // is seeded from the server.
    const photoKeys = prev ? prev.photoKeys : photoKeysFromServer(c.photos);

    return {
      id: c.id,
      _key,
      containerTypeId: c.containerTypeId ?? '',
      containerNumber: c.containerNumber ?? '',
      sealNumber: seals[0]?.sealNumber ?? '',
      cargoWeightKg: c.cargoWeightKg != null ? String(c.cargoWeightKg) : '',
      notes: c.notes ?? '',
      seals,
      photoKeys,
    };
  });

  return { rows, rowKeyToContainerId };
}
