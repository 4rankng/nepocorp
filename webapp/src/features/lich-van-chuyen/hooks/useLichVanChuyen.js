import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchAllLichVanChuyen,
  fetchLichVanChuyenById,
  addLichVanChuyen,
  editLichVanChuyen,
  removeLichVanChuyen,
} from '@services/mockApi/lichVanChuyenApi';
import {
  getDisplayTrangThai,
  formatDateForDisplay,
} from '@features/lich-van-chuyen/utils/lichVanChuyenUtils';

// Simple in-memory cache (per session)
const lichVanChuyenCache = {
  all: [], // Always an array
  byId: {},
  timestamp: 0,
};
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Transform a LichVanChuyen item for UI display
 * @param {any} item
 * @returns {object|null}
 */
const transformLichVanChuyen = item => {
  if (!item) return null;
  return {
    ...item,
    trangThaiDisplay: getDisplayTrangThai(item.trang_thai || item.trangThai),
    ngayBatDauDisplay: formatDateForDisplay(
      (item.thoi_gian_bat_dau_ke_hoach || item.ngayBatDau)?.split('T')[0]
    ),
    ngayKetThucDisplay: formatDateForDisplay(
      (item.thoi_gian_ket_thuc_ke_hoach || item.ngayKetThuc)?.split('T')[0]
    ),
    // Add more transformations as needed
  };
};

const useLichVanChuyen = () => {
  // Explicitly type as any[] for linter
  const [data, setData] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastFetched, setLastFetched] = useState(0);
  /** @type {import('react').MutableRefObject<any>} */
  const cacheRef = useRef(lichVanChuyenCache);

  // Fetch all
  const fetchAll = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const now = Date.now();
      if (
        !force &&
        cacheRef.current.all.length > 0 &&
        now - cacheRef.current.timestamp < CACHE_TTL
      ) {
        setData(/** @type {any[]} */ ([...cacheRef.current.all]));
        setLastFetched(cacheRef.current.timestamp);
        setLoading(false);
        return;
      }
      const result = await fetchAllLichVanChuyen();
      const transformed = Array.isArray(result)
        ? result.map(transformLichVanChuyen).filter(Boolean)
        : [];
      setData(/** @type {any[]} */ (transformed));
      cacheRef.current.all = transformed;
      cacheRef.current.timestamp = now;
      setLastFetched(now);
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? err.message
          : 'Không thể tải dữ liệu lịch vận chuyển';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch by ID
  const fetchById = useCallback(async (/** @type {any} */ id, force = false) => {
    setLoading(true);
    setError('');
    try {
      const now = Date.now();
      if (
        !force &&
        cacheRef.current.byId[String(id)] &&
        now - cacheRef.current.timestamp < CACHE_TTL
      ) {
        setLoading(false);
        return cacheRef.current.byId[String(id)];
      }
      const result = await fetchLichVanChuyenById(id);
      const transformed = transformLichVanChuyen(result);
      cacheRef.current.byId[String(id)] = transformed;
      setLastFetched(now);
      setLoading(false);
      return transformed;
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? err.message
          : 'Không thể tải chi tiết lịch vận chuyển';
      setError(String(msg));
      setLoading(false);
      return null;
    }
  }, []);

  // Add
  const add = useCallback(
    async (/** @type {any} */ data) => {
      setLoading(true);
      setError('');
      try {
        const result = await addLichVanChuyen(data);
        await fetchAll(true); // Refresh cache
        return { success: true, data: transformLichVanChuyen(result) };
      } catch (err) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? err.message
            : 'Lỗi khi thêm lịch vận chuyển';
        setError(String(msg));
        return { success: false, error: String(msg) };
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  // Edit
  const edit = useCallback(
    async (/** @type {any} */ id, /** @type {any} */ updates) => {
      setLoading(true);
      setError('');
      try {
        const result = await editLichVanChuyen(id, updates);
        await fetchAll(true); // Refresh cache
        return { success: true, data: transformLichVanChuyen(result) };
      } catch (err) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? err.message
            : 'Lỗi khi cập nhật lịch vận chuyển';
        setError(String(msg));
        return { success: false, error: String(msg) };
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  // Remove
  const remove = useCallback(
    async (/** @type {any} */ id) => {
      setLoading(true);
      setError('');
      try {
        await removeLichVanChuyen(id);
        await fetchAll(true); // Refresh cache
        return { success: true };
      } catch (err) {
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? err.message
            : 'Lỗi khi xóa lịch vận chuyển';
        setError(String(msg));
        return { success: false, error: String(msg) };
      } finally {
        setLoading(false);
      }
    },
    [fetchAll]
  );

  // Initial fetch
  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear error
  const clearError = () => setError('');

  return {
    data,
    loading,
    error,
    lastFetched,
    fetchAll,
    fetchById,
    add,
    edit,
    remove,
    clearError,
  };
};

export default useLichVanChuyen;
