import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';

/** Result shape from POST /api/ocr. */
export interface OcrResponse {
  ok: boolean;
  containerNumbers?: string[];
  sealNumber?: string | null;
  checkDigitWarnings?: string[];
  photoUrl?: string;
  storageKey?: string;
  model?: string | null;
  error?: string | null;
}

/** A per-container OCR photo held in RAM until its row has a server id
 *  (create mode, or an unsaved new row in edit mode). Flushed by
 *  `flushPendingContainerPhotos` once `saveContainers` assigns ids. */
interface PendingContainerPhoto {
  rowKey: string;
  type: 'CONTAINER' | 'SEAL';
  file: File;
  objectUrl: string;
}

export interface ContainerPhotoUploadResult {
  /** Renderable URL — `/api/photos/...` (persisted) or `blob:...` (pending). */
  url: string;
  /** Raw OCR response (always populated — OCR runs even when buffering so the
   *  number can fill the row immediately). */
  ocrResult: OcrResponse;
  /** True when the photo is buffered in RAM (not yet persisted). */
  pending: boolean;
}

/** Trip-level ("Ảnh đính kèm") upload-in-progress flag. Container/seal capture
 *  tracks its own per-row busy state in `ContainerInstancesCard`. */
export type UploadingState = { OTHER: boolean };

/** True while a trip-level photo upload is in flight. Used for save/submit
 *  disable checks — an in-flight upload must block the action. */
export function isAnyUploading(uploading: UploadingState): boolean {
  return Object.values(uploading).some(Boolean);
}

export function useTripFormPhotos(onError: (msg: string) => void) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<UploadingState>({ OTHER: false });
  // Per-container OCR photos buffered until the row has a server id — see
  // uploadContainerPhoto / flushPendingContainerPhotos / revokeRowPhotos.
  const pendingContainerPhotosRef = useRef<PendingContainerPhoto[]>([]);

  /** Trip-level general photos (`type='OTHER'`). Container/seal photos never go
   *  through here — they are captured per row via `uploadContainerPhoto`. */
  const uploadPhotos = useCallback(async (files: FileList, tripId?: number) => {
    setUploading({ OTHER: true });
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        if (tripId) formData.append('trip_id', String(tripId));
        formData.append('type', 'OTHER');
        const result = await api.upload('/upload', formData) as { url: string };
        setPhotoUrls(prev => [...prev, result.url]);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi khi tải ảnh.');
    } finally {
      setUploading({ OTHER: false });
    }
  }, [onError]);

  const removePhoto = useCallback((idx: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== idx));
  }, []);

  /**
   * Capture a container/seal photo FOR A SPECIFIC ROW. Runs OCR immediately so
   * the recognized number can fill that row right away. Persists + links the
   * photo to the container ONLY when both `tripId` and `containerId` are known
   * (edit mode, row already saved); otherwise buffers the file in RAM
   * (`pending: true`) for flush after `saveContainers` assigns an id.
   *
   * Row-scoped by `rowKey`: the OCR result and the buffered photo always belong
   * to the row whose capture button was pressed — never to "the first empty
   * row" or whatever the list happens to point at.
   *
   * We avoid sending `trip_id` alone: `/ocr` would persist the photo at trip
   * level with no container link, creating an orphan we can't re-link after the
   * row is saved. Buffering instead keeps it in RAM until linkable.
   */
  const uploadContainerPhoto = useCallback(async (
    file: File,
    tripId: number | undefined,
    rowKey: string,
    type: 'CONTAINER' | 'SEAL',
    containerId?: number,
  ): Promise<ContainerPhotoUploadResult> => {
    const canLink = !!tripId && !!containerId;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    if (canLink) {
      formData.append('trip_id', String(tripId));
      formData.append('container_id', String(containerId));
    }
    // Capture NEEDS the recognition result to fill the row, so it stays on the
    // full `/ocr` endpoint. Flush (`flushPendingContainerPhotos`) uses
    // `/ocr/persist-only` instead — it already has the number and only persists.
    const result = await api.upload('/ocr', formData) as OcrResponse;
    if (result.photoUrl) {
      return { url: result.photoUrl, ocrResult: result, pending: false };
    }
    const objectUrl = URL.createObjectURL(file);
    pendingContainerPhotosRef.current.push({ rowKey, type, file, objectUrl });
    return { url: objectUrl, ocrResult: result, pending: true };
  }, []);

  /**
   * After `saveContainers` assigns ids, persist + link the buffered per-container
   * photos and return a map of `blob:` → server URL so the caller can patch
   * `photoKeys`. Rows deleted before save are dropped (object URL revoked).
   *
   * Each buffered photo is bound to the container id of ITS OWN row
   * (`rowKeyToContainerId` is keyed by the row's stable `_key`) — the binding is
   * exact, never positional. Uses `/ocr/persist-only` (NOT `/ocr`): recognition
   * already ran at capture (`uploadContainerPhoto`), so flushing via the full
   * `/ocr` endpoint would re-run the vision model for nothing.
   */
  const flushPendingContainerPhotos = useCallback(async (
    tripId: number,
    rowKeyToContainerId: Map<string, number>,
  ): Promise<Map<string, string>> => {
    const pending = pendingContainerPhotosRef.current;
    if (pending.length === 0) return new Map();
    pendingContainerPhotosRef.current = [];

    const swaps = new Map<string, string>();
    for (const p of pending) {
      const containerId = rowKeyToContainerId.get(p.rowKey);
      if (!containerId) {
        URL.revokeObjectURL(p.objectUrl);
        continue;
      }
      const formData = new FormData();
      formData.append('file', p.file);
      formData.append('type', p.type);
      formData.append('trip_id', String(tripId));
      formData.append('container_id', String(containerId));
      const result = await api.upload('/ocr/persist-only', formData) as OcrResponse;
      if (result.photoUrl) {
        swaps.set(p.objectUrl, result.photoUrl);
      }
      URL.revokeObjectURL(p.objectUrl);
    }
    return swaps;
  }, []);

  /** Revoke + drop all buffered photos for a row (row deleted before save). */
  const revokeRowPhotos = useCallback((rowKey: string) => {
    const keep: PendingContainerPhoto[] = [];
    for (const p of pendingContainerPhotosRef.current) {
      if (p.rowKey === rowKey) URL.revokeObjectURL(p.objectUrl);
      else keep.push(p);
    }
    pendingContainerPhotosRef.current = keep;
  }, []);

  /** Revoke + drop one buffered per-container photo before the row is saved. */
  const revokeContainerPhoto = useCallback((rowKey: string, type: 'CONTAINER' | 'SEAL', objectUrl: string) => {
    if (!objectUrl.startsWith('blob:')) return;
    const keep: PendingContainerPhoto[] = [];
    for (const p of pendingContainerPhotosRef.current) {
      if (p.rowKey === rowKey && p.type === type && p.objectUrl === objectUrl) {
        URL.revokeObjectURL(p.objectUrl);
      } else {
        keep.push(p);
      }
    }
    pendingContainerPhotosRef.current = keep;
  }, []);

  return {
    photoUrls, setPhotoUrls, uploading, uploadPhotos, removePhoto,
    uploadContainerPhoto, flushPendingContainerPhotos, revokeRowPhotos, revokeContainerPhoto,
  };
}
