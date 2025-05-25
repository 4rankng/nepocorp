import { useState, useEffect } from 'react';
import { customerApi } from '@services/mockApi';

const useCustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all customers
  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.getAll();
      setCustomers(response.data || []);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không thể tải danh sách khách hàng';
      setError(errorMessage);
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new customer
  const addCustomer = async (customerData) => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.create(customerData);
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
  };

  // Update existing customer
  const updateCustomer = async (id, customerData) => {
    setLoading(true);
    setError('');
    try {
      const response = await customerApi.update(id, customerData);
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
  const deleteCustomer = async (id) => {
    setLoading(true);
    setError('');
    try {
      await customerApi.delete(id);
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
  const getCustomerById = async (id) => {
    try {
      const response = await customerApi.getById(id);
      return { success: true, data: response.data };
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Không tìm thấy khách hàng';
      console.error('Error getting customer by ID:', err);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => setError('');

  // Initial fetch on mount
  useEffect(() => {
    fetchCustomers();
  }, []);

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
    clearError,
  };
};

export default useCustomerManagement;
