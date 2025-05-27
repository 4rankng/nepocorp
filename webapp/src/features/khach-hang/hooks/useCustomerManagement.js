import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllKhachHang,
  fetchKhachHangById,
  addKhachHang,
  editKhachHang,
  removeKhachHang,
} from '@services/mockApi/khachHangApi';

const initialFormState = {
  ma_dinh_danh: '',
  ten: '',
  dia_chi: '',
  ma_so_thue: '',
};

// Helper function to generate the next customer code
const generateNextCustomerCode = existingCustomers => {
  if (!existingCustomers || existingCustomers.length === 0) return 'KH001';

  // Find the highest code number
  const maxCode = existingCustomers.reduce((max, customer) => {
    if (!customer.code) return max;
    const codeMatch = customer.code.match(/^KH(\d+)$/i);
    if (!codeMatch) return max;
    const num = parseInt(codeMatch[1], 10);
    return !isNaN(num) ? Math.max(max, num) : max;
  }, 0);

  // Generate new code with leading zeros
  return `KH${String(maxCode + 1).padStart(3, '0')}`;
};

const useCustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAllKhachHang();
      setCustomers(response.data || []);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không thể tải danh sách khách hàng';
      setError(errorMessage);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new customer
  const addCustomer = useCallback(
    async customerData => {
      setLoading(true);
      setError('');
      try {
        // Always generate a new code for new customers
        const nextCode = generateNextCustomerCode(customers);
        const processedData = {
          ...customerData,
          code: nextCode,
        };

        const response = await addKhachHang(processedData);
        // Refresh the customer list
        await fetchCustomers();
        return { success: true, data: response.data };
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Lỗi khi thêm khách hàng';
        setError(errorMessage);
        console.error('Error adding customer:', err);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [customers, fetchCustomers]
  );

  // Get initial form data with generated code
  const getInitialFormData = useCallback(() => {
    const nextCode = generateNextCustomerCode(customers);
    return {
      ...initialFormState,
      code: nextCode,
    };
  }, [customers]);

  // Update existing customer
  const updateCustomer = async (id, customerData) => {
    setLoading(true);
    setError('');
    try {
      const response = await editKhachHang(id, customerData);
      // Refresh the customer list
      await fetchCustomers();
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi khi sửa khách hàng';
      setError(errorMessage);
      console.error('Error updating customer:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete customer
  const deleteCustomer = async id => {
    setLoading(true);
    setError('');
    try {
      await removeKhachHang(id);
      // Remove from local state immediately for better UX
      setCustomers(prev => prev.filter(c => c.id !== id));
      return { success: true };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi khi xóa khách hàng';
      setError(errorMessage);
      console.error('Error deleting customer:', err);
      // Refresh the list in case of error to ensure consistency
      await fetchCustomers();
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get customer by ID
  const getCustomerById = useCallback(async id => {
    try {
      const response = await fetchKhachHangById(id);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không tìm thấy khách hàng';
      console.error('Error getting customer by ID:', err);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Get customer by code
  const getCustomerByCode = useCallback(async code => {
    try {
      const response = await fetchKhachHangById(code);
      return { success: true, data: response.data };
    } catch (err) {
      // Not found is an expected case, don't log as error
      if (err.response?.status !== 404) {
        console.error('Error getting customer by code:', err);
      }
      return { success: false, error: err.response?.data?.error };
    }
  }, []);

  // Check if a customer code is available
  const isCustomerCodeAvailable = useCallback(async (code, excludeId = null) => {
    if (!code || code.trim() === '') return true;

    try {
      const response = await fetchKhachHangById(code);
      // If we're excluding an ID (for updates), it's okay if it's the same customer
      if (excludeId && response.data && response.data.id === excludeId) {
        return true;
      }
      return false;
    } catch (err) {
      // 404 means code is available
      return err.response?.status === 404;
    }
  }, []);

  // Clear error
  const clearError = () => setError('');

  // Initial fetch on mount
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    // State
    customers,
    loading,
    error,

    // Actions
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerByCode,
    isCustomerCodeAvailable,
    getInitialFormData,
    clearError,
  };
};

export default useCustomerManagement;
