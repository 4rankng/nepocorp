import { useState, useEffect } from 'react';
import { getContainerTypes, addContainerType, updateContainerType, deleteContainerType } from '@services/mockData/containers';

const useContainerTypeManagement = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all container types
  const fetchContainerTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContainerTypes();
      setContainerTypes(data || []);
    } catch (err) {
      const errorMessage = err.message || 'Không thể tải danh sách loại container';
      setError(errorMessage);
      console.error('Error fetching container types:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new container type
  const addNewContainerType = async (containerTypeData) => {
    setLoading(true);
    setError('');
    try {
      const newContainerType = await addContainerType(containerTypeData);
      // Refresh the container types list
      await fetchContainerTypes();
      return { success: true, data: newContainerType };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi thêm loại container';
      setError(errorMessage);
      console.error('Error adding container type:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Update existing container type
  const updateExistingContainerType = async (id, containerTypeData) => {
    setLoading(true);
    setError('');
    try {
      const updatedContainerType = await updateContainerType(id, containerTypeData);
      // Refresh the container types list
      await fetchContainerTypes();
      return { success: true, data: updatedContainerType };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi sửa loại container';
      setError(errorMessage);
      console.error('Error updating container type:', err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Delete container type
  const deleteExistingContainerType = async (id) => {
    setLoading(true);
    setError('');
    try {
      await deleteContainerType(id);
      // Remove from local state immediately for better UX
      setContainerTypes(prev => prev.filter(ct => ct.id !== id));
      return { success: true };
    } catch (err) {
      const errorMessage = err.message || 'Lỗi khi xóa loại container';
      setError(errorMessage);
      console.error('Error deleting container type:', err);
      // Refresh the list in case of error to ensure consistency
      await fetchContainerTypes();
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Get container type by ID
  const getContainerTypeById = async (id) => {
    try {
      const containerType = containerTypes.find(ct => ct.id === id);
      if (containerType) {
        return { success: true, data: containerType };
      } else {
        return { success: false, error: 'Không tìm thấy loại container' };
      }
    } catch (err) {
      const errorMessage = err.message || 'Không tìm thấy loại container';
      console.error('Error getting container type by ID:', err);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => setError('');

  // Initial fetch on mount
  useEffect(() => {
    fetchContainerTypes();
  }, []);

  return {
    // State
    containerTypes,
    loading,
    error,

    // Actions
    fetchContainerTypes,
    addContainerType: addNewContainerType,
    updateContainerType: updateExistingContainerType,
    deleteContainerType: deleteExistingContainerType,
    getContainerTypeById,
    clearError,
  };
};

export default useContainerTypeManagement;
