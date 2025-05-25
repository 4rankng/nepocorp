import { useState, useEffect } from 'react';
import { getPartners, addPartner, updatePartner, deletePartner } from '@services/mockData/partners';

const usePartnerManagement = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all partners
  const fetchPartners = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getPartners();
      setPartners(data || []);
    } catch (err) {
      const errorMessage = err.message || 'Không thể tải danh sách đối tác';
      setError(errorMessage);
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new partner
  const addNewPartner = async (partnerData) => {
    setLoading(true);
    setError('');
    try {
      const newPartner = await addPartner(partnerData);
      // Refresh the partner list
      await fetchPartners();
      return { success: true, data: newPartner };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi thêm đối tác';
      setError(errorMessage);
      console.error('Error adding partner:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update existing partner
  const updateExistingPartner = async (id, partnerData) => {
    setLoading(true);
    setError('');
    try {
      const updatedPartner = await updatePartner(id, partnerData);
      // Refresh the partner list
      await fetchPartners();
      return { success: true, data: updatedPartner };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi sửa đối tác';
      setError(errorMessage);
      console.error('Error updating partner:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete partner
  const deleteExistingPartner = async (id) => {
    setLoading(true);
    setError('');
    try {
      await deletePartner(id);
      // Remove from local state immediately for better UX
      setPartners(prev => prev.filter(p => p.id !== id));
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi xóa đối tác';
      setError(errorMessage);
      console.error('Error deleting partner:', err);
      // Refresh the list in case of error to ensure consistency
      await fetchPartners();
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get partner by ID
  const getPartnerById = async (id) => {
    try {
      const partner = partners.find(p => p.id === id);
      if (partner) {
        return { success: true, data: partner };
      } else {
        return { success: false, error: 'Không tìm thấy đối tác' };
      }
    } catch (err) {
      const errorMessage = err.message || 'Không tìm thấy đối tác';
      console.error('Error getting partner by ID:', err);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => setError('');

  // Initial fetch on mount
  useEffect(() => {
    fetchPartners();
  }, []);

  return {
    // State
    partners,
    loading,
    error,

    // Actions
    fetchPartners,
    addPartner: addNewPartner,
    updatePartner: updateExistingPartner,
    deletePartner: deleteExistingPartner,
    getPartnerById,
    clearError,
  };
};

export default usePartnerManagement;
