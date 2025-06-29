import { useState, useEffect, useCallback } from 'react';
import { partnerApi } from '@services/api/partnerApi';

const fetchAllDoiTac = partnerApi.getAllWithoutPagination;
const fetchDoiTacById = partnerApi.getById;
const addDoiTac = partnerApi.create;
const editDoiTac = partnerApi.update;
const removeDoiTac = partnerApi.delete;
// Initial form state
const initialFormState = {
  ma_dinh_danh: '',
  ten: '',
  dia_chi: '',
  ma_so_thue: '',
  contact_person: '',
  contact_phone: '',
  contact_email: '',
  notes: '',
};
const useDoiTac = () => {
  const [partners, setPartners] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Fetch all partners
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchAllDoiTac();
      const partnersData = response?.data || [];
      // Map API fields to frontend fields
      const mappedPartners = partnersData.map(partner => ({
        ...partner,
        ten: partner.name,
        ma_so_thue: partner.tax_code,
        dia_chi: partner.address,
        ma_dinh_danh: partner.id ? `DT${partner.id.toString().padStart(3, '0')}` : '',
      }));
      setPartners(mappedPartners);
    } catch (err) {
      const errorMessage =
        (err instanceof Error ? err.message : String(err)) || 'Không thể tải danh sách đối tác';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);
  // Add new partner
  const addNewPartner = useCallback(
    /**
     * @param {Object} partnerData - Partner data object
     */
    async partnerData => {
      setLoading(true);
      setError('');
      try {
        const response = await addDoiTac(partnerData);
        await fetchPartners();
        return { success: true, data: response?.data };
      } catch (err) {
        const errorMessage =
          (err instanceof Error ? err.message : String(err)) || 'Lỗi khi thêm đối tác';
        setError(errorMessage);

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [fetchPartners]
  );
  // Get initial form data
  const getInitialFormData = useCallback(() => {
    let maxCode = 0;
    partners.forEach(partner => {
      if (partner?.ma_dinh_danh && partner.ma_dinh_danh.startsWith('DT')) {
        const numPart = parseInt(partner.ma_dinh_danh.substring(2), 10);
        if (!isNaN(numPart) && numPart > maxCode) {
          maxCode = numPart;
        }
      }
    });
    const nextCodeNum = maxCode + 1;
    const nextMaDinhDanh = `DT${nextCodeNum.toString().padStart(3, '0')}`;
    return {
      ...initialFormState,
      ma_dinh_danh: nextMaDinhDanh,
    };
  }, [partners]);
  // Check if a partner code is available
  const isPartnerCodeAvailable = useCallback(
    /**
     * @param {string} ma_dinh_danh - Partner code to check
     * @param {string|null} excludeId - ID to exclude from check
     */
    async (ma_dinh_danh, excludeId = null) => {
      if (!ma_dinh_danh || ma_dinh_danh.trim() === '') return false;
      try {
        const response = await fetchAllDoiTac();
        const all = response?.data || [];
        const found = all.find(
          /** @param {any} p */
          p => {
            const mappedCode = p.id ? `DT${p.id.toString().padStart(3, '0')}` : '';
            return mappedCode === ma_dinh_danh && (!excludeId || p?.id !== excludeId);
          }
        );
        return !found;
      } catch (_err) {
        return true;
      }
    },
    []
  );
  // Update existing partner
  /**
   * @param {string|number} id - Partner ID
   * @param {Object} partnerData - Partner data object
   */
  const updateExistingPartner = async (id, partnerData) => {
    setLoading(true);
    setError('');
    try {
      const response = await editDoiTac(id, partnerData);
      await fetchPartners();
      return { success: true, data: response?.data };
    } catch (err) {
      const errorMessage =
        (err instanceof Error ? err.message : String(err)) || 'Lỗi khi sửa đối tác';
      setError(errorMessage);

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  // Delete partner
  /**
   * @param {string|number} id - Partner ID
   */
  const deleteExistingPartner = async id => {
    setLoading(true);
    setError('');
    try {
      await removeDoiTac(id);
      await fetchPartners();
      return { success: true };
    } catch (err) {
      const errorMessage =
        (err instanceof Error ? err.message : String(err)) || 'Lỗi khi xóa đối tác';
      setError(errorMessage);

      await fetchPartners();
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  // Get partner by ID
  /**
   * @param {string|number} id - Partner ID
   */
  const getPartnerById = async id => {
    try {
      const response = await fetchDoiTacById(id);
      const partner = response?.data;
      if (partner) {
        return { success: true, data: partner };
      } else {
        return { success: false, error: 'Không tìm thấy đối tác' };
      }
    } catch (err) {
      const errorMessage =
        (err instanceof Error ? err.message : String(err)) || 'Không tìm thấy đối tác';

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
export default useDoiTac;
