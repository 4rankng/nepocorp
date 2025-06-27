import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDiDuong } from '../../hooks/useDiDuong';
import { useSnackbar } from 'notistack';
import logger from '@services/logger';

// Mock API functions returning empty data until backend is integrated
const updateTuyenDuong = async (id, data) => ({ id, ...data });
const tuyenDuongApi = {
  create: async (data) => ({ id: Date.now(), ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => ({ success: true })
};
const dinhMucDiDuongApi = {
  create: async (data) => ({ id: Date.now(), ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => ({ success: true })
};

export const useDinhMucDiDuongLogic = () => {
  const {
    roadNorms: hookRoadNorms,
    containerTypes,
    routes: hookRoutes,
    isLoading,
    error,
    deleteTuyenDuongAndNorms,
    fetchAllData,
    createRoadNorm,
    updateRoadNorm,
  } = useDiDuong();

  const { enqueueSnackbar } = useSnackbar();
  const [localRoutes, setLocalRoutes] = useState([]);
  const [localRoadNorms, setLocalRoadNorms] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Update local state when hook data changes
  useEffect(() => {
    if (hookRoutes) {
      setLocalRoutes(hookRoutes);
    }
  }, [hookRoutes]);

  useEffect(() => {
    if (hookRoadNorms) {
      setLocalRoadNorms(hookRoadNorms);
    }
  }, [hookRoadNorms]);

  // Data processing
  const tableData = useMemo(() => {
    if (!localRoutes || !Array.isArray(localRoutes)) return [];

    return localRoutes.map(route => {
      const containerNorms = {};
      if (containerTypes && Array.isArray(containerTypes)) {
        containerTypes.forEach(container => {
          const norm = localRoadNorms.find(
            norm => norm.ma_tuyen === route.ma_tuyen && norm.ma_loai_cont === container.ma_loai_cont
          );
          containerNorms[container.ma_loai_cont] = norm ? norm.gia_dinh_muc || 0 : 0;
        });
      }

      return {
        id: route.id || route.ma_tuyen,
        ma_tuyen: route.ma_tuyen || '',
        diem_di: route.diem_di || '',
        diem_den: route.diem_den || '',
        containerNorms,
      };
    });
  }, [localRoutes, localRoadNorms, containerTypes]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return tableData;
    return tableData.filter(row =>
      Object.values(row).some(value =>
        value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tableData, searchTerm]);

  const paginatedData = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize;
    return filteredData.slice(startIndex, startIndex + pagination.pageSize);
  }, [filteredData, pagination]);

  // Form submission
  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      logger.info('Submitting new route with norms', data);

      // Create or update route
      let routeResult;
      if (editingId) {
        routeResult = await updateTuyenDuong(editingId, {
          ma_tuyen: data.ma_tuyen,
          diem_di: data.diem_di,
          diem_den: data.diem_den,
        });
      } else {
        routeResult = await tuyenDuongApi.create({
          ma_tuyen: data.ma_tuyen,
          diem_di: data.diem_di,
          diem_den: data.diem_den,
        });
      }

      // Create/update norms for each container type
      for (const containerKey in data.containerNorms) {
        const normData = {
          ma_tuyen: data.ma_tuyen,
          ma_loai_cont: containerKey,
          gia_dinh_muc: data.containerNorms[containerKey],
        };

        if (editingId) {
          await updateRoadNorm(normData);
        } else {
          await createRoadNorm(normData);
        }
      }

      enqueueSnackbar(editingId ? 'Sửa thành công!' : 'Thêm mới thành công!', {
        variant: 'success'
      });

      await fetchAllData();
      setEditingId(null);
      setIsAddingNew(false);

    } catch (error) {
      logger.error('Error submitting form:', error);
      enqueueSnackbar('Có lỗi xảy ra, vui lòng thử lại', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete handlers
  const handleDeleteClick = (row) => {
    setItemToDelete(row);
    setIsDeleting(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteTuyenDuongAndNorms(itemToDelete.ma_tuyen);
      enqueueSnackbar('Xóa thành công!', { variant: 'success' });
      await fetchAllData();
    } catch (error) {
      logger.error('Error deleting route:', error);
      enqueueSnackbar('Có lỗi xảy ra khi xóa', { variant: 'error' });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // Edit handlers
  const handleEditClick = (row) => {
    setEditingId(row.id);
    setEditedData({
      ma_tuyen: row.ma_tuyen,
      diem_di: row.diem_di,
      diem_den: row.diem_den,
      containerNorms: { ...row.containerNorms },
    });
  };

  const handleAddNew = () => {
    const newRow = {
      ma_tuyen: '',
      diem_di: '',
      diem_den: '',
      containerNorms: {},
    };

    if (containerTypes) {
      containerTypes.forEach(container => {
        newRow.containerNorms[container.ma_loai_cont] = 0;
      });
    }

    setEditedData(newRow);
    setIsAddingNew(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
    setIsAddingNew(false);
  };

  const handleInputChange = (field, value, containerKey = null) => {
    setEditedData(prev => {
      if (containerKey) {
        return {
          ...prev,
          containerNorms: {
            ...prev.containerNorms,
            [containerKey]: Number(value) || 0,
          },
        };
      }
      return {
        ...prev,
        [field]: value,
      };
    });
  };

  return {
    // Data
    tableData,
    filteredData,
    paginatedData,
    containerTypes,
    localRoutes,
    localRoadNorms,

    // Loading states
    isLoading,
    error,
    isSaving,
    isDeleting,

    // Edit states
    editingId,
    editedData,
    isAddingNew,
    itemToDelete,

    // Pagination and search
    pagination,
    setPagination,
    searchTerm,
    setSearchTerm,

    // Handlers
    onSubmit,
    handleDeleteClick,
    handleConfirmDelete,
    handleEditClick,
    handleAddNew,
    handleCancelEdit,
    handleInputChange,
    setIsDeleting,
    setItemToDelete,
  };
};
