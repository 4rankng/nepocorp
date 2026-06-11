import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export function useTripFormPhotos(onError: (msg: string) => void) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const uploadPhotos = useCallback(async (files: FileList, tripId?: number, type: 'CONTAINER' | 'SEAL' | 'OTHER' = 'OTHER') => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        if (tripId) formData.append("trip_id", String(tripId));
        formData.append("type", type);
        const result = await api.upload("/upload", formData) as { url: string };
        setPhotoUrls((prev) => [...prev, result.url]);
      }
    } catch (err: any) {
      onError(err.message || "Lỗi khi tải ảnh.");
    } finally {
      setUploading(false);
    }
  }, [onError]);

  const removePhoto = useCallback((idx: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  return { photoUrls, setPhotoUrls, uploading, uploadPhotos, removePhoto };
}
