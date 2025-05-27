import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllDoiTac,
  fetchDoiTacById,
  addDoiTac,
  editDoiTac,
  removeDoiTac,
} from '@services/mockApi/doiTacApi';

// Initial form state
const initialFormState = {
  ma_dinh_danh: '',
  ten: '',
  dia_chi: '',
  ma_so_thue: '',
};

const usePartnerManagement = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all partners
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAllDoiTac();
      setPartners(data || []);
    } catch (err) {
      const errorMessage = err.message || 'Không thể tải danh sách đối tác';
      setError(errorMessage);
      console.error('Error fetching partners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new partner
  const addNewPartner = useCallback(
    async partnerData => {
      setLoading(true);
      setError('');
      try {
        const newPartner = await addDoiTac(partnerData);
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
    },
    [fetchPartners]
  );

  // Get initial form data
  const getInitialFormData = useCallback(() => {
    return { ...initialFormState };
  }, []);

  // Check if a partner code is available
  const isPartnerCodeAvailable = useCallback(async (ma_dinh_danh, excludeId = null) => {
    if (!ma_dinh_danh || ma_dinh_danh.trim() === '') return false;
    try {
      const all = await fetchAllDoiTac();
      const found = all.find(
        p => p.ma_dinh_danh === ma_dinh_danh && (!excludeId || p.id !== excludeId)
      );
      return !found;
    } catch (err) {
      return true;
    }
  }, []);

  // Update existing partner
  const updateExistingPartner = async (id, partnerData) => {
    setLoading(true);
    setError('');
    try {
      const updatedPartner = await editDoiTac(id, partnerData);
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
  const deleteExistingPartner = async id => {
    setLoading(true);
    setError('');
    try {
      await removeDoiTac(id);
      await fetchPartners();
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi xóa đối tác';
      setError(errorMessage);
      console.error('Error deleting partner:', err);
      await fetchPartners();
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get partner by ID
  const getPartnerById = async id => {
    try {
      const partner = await fetchDoiTacById(id);
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
  }, [fetchPartners]);

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
    isPartnerCodeAvailable,
    getInitialFormData,
    clearError,
  };
};

export default usePartnerManagement;
