import { useState, useEffect, useCallback } from 'react';
import logger from '@services/logger';
import { customerApi } from '@services/api/customerApi';
const initialFormState = {
  name: '',
  address: '',
  tax_code: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  notes: '',
};
// No data transformation needed - using backend field names directly
const useCustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Fetch all customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không thể tải danh sách khách hàng';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  // Add new customer
  const addCustomer = useCallback(async customerData => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.create(customerData);
      const newCustomer = response.data;
      setCustomers(prev => [...prev, newCustomer]);
      return { success: true, data: newCustomer };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi khi thêm khách hàng';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);
  // Get initial form data
  const getInitialFormData = useCallback(() => {
    return { ...initialFormState };
  }, []);
  // Update existing customer
  const updateCustomer = async (id, customerData) => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.update(id, customerData);
      const updatedCustomer = response.data;
      setCustomers(prev => prev.map(customer => (customer.id === id ? updatedCustomer : customer)));
      return { success: true, data: updatedCustomer };
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
      await customerApi.delete(id);
      setCustomers(prev => prev.filter(customer => customer.id !== id));
      return { success: true };
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
      const response = await customerApi.getById(id);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không tìm thấy khách hàng';
      return { success: false, error: errorMessage };
    }
  }, []);
  // Get customer by tax code
  const getCustomerByCode = useCallback(async taxCode => {
    try {
      // Since backend doesn't have a specific endpoint for tax_code lookup,
      // we'll search through all customers
      const response = await customerApi.getAll();
      const customer = response.data.find(c => c.tax_code === taxCode);
      if (customer) {
        return { success: true, data: customer };
      } else {
        return { success: false, error: 'Không tìm thấy khách hàng' };
      }
    } catch (error) {
      // Not found is an expected case, don't log as error
      if (error.response?.status !== 404) {
        logger.error('Error fetching customer by tax code', {
          taxCode,
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
  // Check if a customer tax code is available
  const isTaxCodeAvailable = useCallback(async (taxCode, excludeId = null) => {
    if (!taxCode || taxCode.trim() === '') return true;
    try {
      const response = await customerApi.getAll();
      const existingCustomer = response.data.find(c => c.tax_code === taxCode);
      if (existingCustomer) {
        // If excludeId is provided, check if it's the same customer being updated
        return excludeId && existingCustomer.id === excludeId;
      }
      return true; // Tax code is available
    } catch (_err) {
      // If there's an error fetching, assume code is available
      return true;
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
    isTaxCodeAvailable,
    getInitialFormData,
    clearError,
  };
};
export default useCustomerManagement;
