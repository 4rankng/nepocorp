import { useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';

type PhotoType = 'CONTAINER' | 'SEAL' | 'OTHER';

/** Result shape from POST /api/ocr. */
interface OcrResponse {
  ok: boolean;
  containerNumbers?: string[];
  sealNumber?: string | null;
  checkDigitWarnings?: string[];
  photoUrl?: string;
  storageKey?: string;
  model?: string | null;
  error?: string | null;
}

/** A create-mode OCR photo held in RAM until the trip has an id. */
interface PendingPhoto {
  file: File;
  type: 'CONTAINER' | 'SEAL';
  objectUrl: string;
}

export type OcrResultHandler = (
  containerNumbers: string[],
  sealNumber: string | null,
  type: 'CONTAINER' | 'SEAL',
) => void;

/** Per-zone upload-in-progress flag. Tracks CONTAINER, SEAL, and OTHER
 *  independently so a pending container upload doesn't grey out the seal
 *  button (and vice-versa). */
export type UploadingState = Record<PhotoType, boolean>;

/** True when any zone is currently uploading. Use this for save/submit
 *  disable checks where any in-flight upload should block the action. */
export function isAnyUploading(uploading: UploadingState): boolean {
  return Object.values(uploading).some(Boolean);
}

export function useTripFormPhotos(onError: (msg: string) => void, onOcrResult?: OcrResultHandler) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<UploadingState>({ CONTAINER: false, SEAL: false, OTHER: false });
  // Create-mode OCR photos are kept in RAM (no trip id yet) and uploaded once
  // the trip is created — see flushPendingPhotos.
  const pendingRef = useRef<PendingPhoto[]>([]);

  const uploadPhotos = useCallback(async (files: FileList, tripId?: number, type: PhotoType = 'OTHER') => {
    setUploading(prev => ({ ...prev, [type]: true }));
    try {
      for (const file of Array.from(files)) {
        if (type === 'CONTAINER' || type === 'SEAL') {
          // Route container/seal uploads through OCR (auto-fill + persist when trip exists).
          const formData = new FormData();
          formData.append('file', file);
          formData.append('type', type);
          if (tripId) formData.append('trip_id', String(tripId));

          const result = await api.upload('/ocr', formData) as OcrResponse;
          onOcrResult?.(result.containerNumbers ?? [], result.sealNumber ?? null, type);

          if (result.photoUrl) {
            // Edit branch: photo persisted server-side.
            setPhotoUrls(prev => [...prev, result.photoUrl!]);
          } else if (!tripId) {
            // Create branch: hold the file in RAM + local preview until the trip exists.
            const objectUrl = URL.createObjectURL(file);
            pendingRef.current.push({ file, type, objectUrl });
            setPhotoUrls(prev => [...prev, objectUrl]);
          }

          // Surface a friendly OCR error (e.g. key not configured, no numbers) —
          // the photo may still have been saved (Edit) so this is informational.
          if (result.error) onError(result.error);
        } else {
          // OTHER → existing upload endpoint.
          const formData = new FormData();
          formData.append('file', file);
          if (tripId) formData.append('trip_id', String(tripId));
          formData.append('type', type);
          const result = await api.upload('/upload', formData) as { url: string };
          setPhotoUrls(prev => [...prev, result.url]);
        }
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Lỗi khi tải ảnh.');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  }, [onError, onOcrResult]);

  const removePhoto = useCallback((idx: number) => {
    setPhotoUrls(prev => {
      const url = prev[idx];
      // Revoke any local object-URL preview we were holding.
      if (url && url.startsWith('blob:')) {
        pendingRef.current = pendingRef.current.filter(p => p.objectUrl !== url);
        URL.revokeObjectURL(url);
      }
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  /**
   * After a trip is created (create mode), upload the held OCR photos with the
   * new trip id and replace their local object-URL previews with real server
   * URLs. Returns the final photoUrls array so the caller can use it directly
   * in the create payload (state updates are async).
   */
  const flushPendingPhotos = useCallback(async (tripId: number): Promise<string[]> => {
    const pending = pendingRef.current;
    if (pending.length === 0) return photoUrls;
    pendingRef.current = [];

    const objToReal = new Map<string, string>();
    for (const p of pending) {
      const formData = new FormData();
      formData.append('file', p.file);
      formData.append('trip_id', String(tripId));
      formData.append('type', p.type);
      const result = await api.upload('/upload', formData) as { url: string };
      objToReal.set(p.objectUrl, result.url);
      URL.revokeObjectURL(p.objectUrl);
    }

    const finalUrls = photoUrls.map(u => objToReal.get(u) ?? u);
    setPhotoUrls(finalUrls);
    return finalUrls;
  }, [photoUrls]);

  return { photoUrls, setPhotoUrls, uploading, uploadPhotos, removePhoto, flushPendingPhotos };
}
