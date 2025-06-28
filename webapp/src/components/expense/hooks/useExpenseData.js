import { useState, useEffect, useCallback } from 'react';
import { expenseApi } from '@services/api/expenseApi';

const useExpenseData = (expenseId, isOpen) => {
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchExpenseData = useCallback(async () => {
    if (!expenseId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await expenseApi.getById(expenseId);
      const data = response.data?.data || response.data || response;

      // Ensure items is always an array
      if (data && !Array.isArray(data.items)) {
        data.items = data.items ? [data.items] : [];
      }

      setExpenseData(data);
    } catch (err) {
      setError('Không thể tải thông tin hóa đơn');
      console.error('Error fetching expense data:', err);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    if (isOpen && expenseId) {
      fetchExpenseData();
    }
  }, [isOpen, expenseId, fetchExpenseData]);

  const refreshData = useCallback(() => {
    return fetchExpenseData();
  }, [fetchExpenseData]);

  return {
    expenseData,
    loading,
    error,
    refreshData,
  };
};

export default useExpenseData;