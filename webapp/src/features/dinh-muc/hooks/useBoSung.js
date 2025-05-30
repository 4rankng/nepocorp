import { useState, useEffect, useCallback } from 'react';
import * as cauHinhApi from '@services/mockApi/cauHinhApi';
/**
 * Hook for managing supplementary fuel standards (định mức bổ sung)
 */
export const useBoSung = () => {
  const [supplementaryStandard, setSupplementaryStandard] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Fetch supplementary standard
  const fetchSupplementaryStandard = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await cauHinhApi.getDinhMucBoSung();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to fetch supplementary standard');
      }
      const data = response.data || { value: 0 };
      setSupplementaryStandard(data.value || 0);
      return data.value || 0;
    } catch (err) {
      console.error('Failed to fetch supplementary standard:', err);
      setError('Không thể tải dữ liệu định mức bổ sung. Vui lòng thử lại.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Update supplementary standard
  const updateSupplementaryStandard = useCallback(async newValue => {
    setIsLoading(true);
    setError('');
    try {
      const response = await cauHinhApi.updateDinhMucBoSung(newValue);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update supplementary standard');
      }
      setSupplementaryStandard(newValue);
      return response.data;
    } catch (err) {
      console.error('Error updating supplementary standard:', err);
      setError('Lỗi khi cập nhật định mức bổ sung');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Load data on mount
  useEffect(() => {
    fetchSupplementaryStandard();
  }, [fetchSupplementaryStandard]);
  return {
    supplementaryStandard,
    isLoading,
    error,
    fetchSupplementaryStandard,
    updateSupplementaryStandard,
  };
};
