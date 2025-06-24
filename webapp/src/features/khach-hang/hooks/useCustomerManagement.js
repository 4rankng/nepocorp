import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
// TODO: Replace with actual API imports
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
      // TODO: Replace with actual API call
      throw new Error('fetchAllKhachHang API function not implemented');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không thể tải danh sách khách hàng';
      setError(errorMessage);
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
        // TODO: Replace with actual API call
        throw new Error('addKhachHang API function not implemented');
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Lỗi khi thêm khách hàng';
        setError(errorMessage);

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
      ma_dinh_danh: nextCode,
    };
  }, [customers]);
  // Update existing customer
  const updateCustomer = async (id, customerData) => {
    setLoading(true);
    setError('');
    try {
      // TODO: Replace with actual API call
      throw new Error('editKhachHang API function not implemented');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi khi sửa khách hàng';
      setError(errorMessage);

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
      // TODO: Replace with actual API call
      throw new Error('removeKhachHang API function not implemented');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi khi xóa khách hàng';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  // Get customer by ID
  const getCustomerById = useCallback(async id => {
    try {
      // TODO: Replace with actual API call
      throw new Error('fetchKhachHangById API function not implemented');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không tìm thấy khách hàng';

      return { success: false, error: errorMessage };
    }
  }, []);
  // Get customer by code
  const getCustomerByCode = useCallback(async code => {
    try {
      // TODO: Replace with actual API call
      throw new Error('fetchKhachHangById API function not implemented');
    } catch (error) {
      // Not found is an expected case, don't log as error
      if (error.response?.status !== 404) {
        logger.error('Error fetching customer by code', {
          code,
          error: error.message,
          status: error.response?.status,
        });
      }
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  }, []);
  // Check if a customer code is available
  const isCustomerCodeAvailable = useCallback(async (code, excludeId = null) => {
    if (!code || code.trim() === '') return true;
    try {
      // TODO: Replace with actual API call
      throw new Error('fetchKhachHangById API function not implemented');
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
