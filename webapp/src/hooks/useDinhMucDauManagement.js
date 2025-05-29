import { useState, useEffect, useCallback } from 'react';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi';
import * as dauKeoApi from '@services/mockApi/dauKeoApi';
import * as roMoocApi from '@services/mockApi/roMoocApi';

export const useDinhMucDauManagement = () => {
  const [dinhMucHang, setDinhMucHang] = useState({}); // Format: { '51C-12345': [...] }
  const [dinhMucVo, setDinhMucVo] = useState({}); // Format: { '51C-12345': [...] }
  const [allAvailableLicensePlates, setAllAvailableLicensePlates] = useState([]); // All tractor + trailer plates
  const [supplementaryStandard, setSupplementaryStandard] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const showSnackbar = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);
  const closeSnackbar = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dinhMucResponse, dauKeoResponse, roMoocResponse] = await Promise.all([
        dinhMucDauApi.getAllDinhMucDau(),
        dauKeoApi.getAll(),
        roMoocApi.getAll(),
      ]);

      if (dinhMucResponse.error) throw new Error(dinhMucResponse.error);
      if (dauKeoResponse.error) throw new Error(dauKeoResponse.error);
      if (roMoocResponse.error) throw new Error(roMoocResponse.error);

      const allDinhMucData = dinhMucResponse.data || [];
      const dauKeoData = dauKeoResponse.data || [];
      const roMoocData = roMoocResponse.data || [];

      const hangDataItems = allDinhMucData.filter(item => item.phan_loai === 'km_hang');
      const voDataItems = allDinhMucData.filter(item => item.phan_loai === 'km_vo');
      
      const hangGrouped = hangDataItems.reduce((acc, item) => {
        // Ensure item.bien_so_xe is used, matching mock data structure if it's bienSoXe, adjust here.
        // Assuming the API returns bien_so_xe as per previous understanding for grouping.
        const plateKey = item.bien_so_xe || item.bienSoXe;
        if (!acc[plateKey]) acc[plateKey] = [];
        acc[plateKey].push({
          id: item.id,
          fromKm: item.tuKm,
          toKm: item.denKm,
          standard: item.l_km,
          note: item.ghiChu,
          // Keep original fields for other operations like editing
          bien_so_xe: plateKey,
          phan_loai: item.phan_loai,
          tuKm: item.tuKm,
          denKm: item.denKm,
          l_km: item.l_km,
          ghiChu: item.ghiChu,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
        return acc;
      }, {});
      setDinhMucHang(hangGrouped);
      const voGrouped = voDataItems.reduce((acc, item) => {
        const plateKey = item.bien_so_xe || item.bienSoXe;
        if (!acc[plateKey]) acc[plateKey] = [];
        acc[plateKey].push({
          id: item.id,
          fromKm: item.tuKm,
          toKm: item.denKm,
          standard: item.l_km,
          note: item.ghiChu,
          // Keep original fields for other operations like editing
          bien_so_xe: plateKey,
          phan_loai: item.phan_loai,
          tuKm: item.tuKm,
          denKm: item.denKm,
          l_km: item.l_km,
          ghiChu: item.ghiChu,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });
        return acc;
      }, {});
      setDinhMucVo(voGrouped);
      setSupplementaryStandard(supData.value || 0);
      // Combine tractor and trailer license plates
      const tractorPlates = dauKeoData.map(dk => ({ licensePlate: dk.bien_so, type: 'dau_keo' }));
      const trailerPlates = roMoocData.map(rm => ({ licensePlate: rm.bien_so, type: 'ro_mooc' }));
      setAllAvailableLicensePlates([...tractorPlates, ...trailerPlates]);
    } catch (err) {
      console.error('Failed to fetch Dinh Muc data:', err);
      setError('Không thể tải dữ liệu định mức. Vui lòng thử lại.');
      showSnackbar('Lỗi tải dữ liệu định mức', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showSnackbar]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  // Placeholder for other states and functions that will be moved later
  const [formData, setFormData] = useState({
    bienSoXe: '',
    loaiDinhMuc: 'km_hang',
    fromKm: '',
    toKm: '',
    standard: '', // Changed from 'dinhMuc' to 'standard' to match DinhMucDialog
    note: '', // Changed from 'ghiChu' to 'note'
  });
  const [errors, setErrors] = useState({});
  const [currentStandard, setCurrentStandard] = useState(null); // For editing
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editSupplementaryDialog, setEditSupplementaryDialog] = useState(false);
  // deleteState and the first set of delete functions were here, now removed.
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    type: null,
    details: '',
  }); // Ensuring the correct state variable is defined
  // --- Supplementary Standard Dialog ---
  const openEditSupplementaryDialog = useCallback(() => {
    // The supplementaryStandard state already holds the value to be edited
    setEditSupplementaryDialog(true);
  }, [setEditSupplementaryDialog]);
  const closeEditSupplementaryDialog = useCallback(() => {
    setEditSupplementaryDialog(false);
  }, [setEditSupplementaryDialog]);
  const handleSaveSupplementary = useCallback(
    async newValue => {
      setIsLoading(true);
      try {
        // Call the API with just the new value
        await dinhMucApi.updateBoSung(newValue);
        setSupplementaryStandard(newValue); // Update local state
        showSnackbar('Cập nhật định mức bổ sung thành công');
        closeEditSupplementaryDialog();
        // Optionally, call fetchData() if other parts of the app need to react to this global change
        // await fetchData();
      } catch (err) {
        console.error('Error saving supplementary standard:', err);
        showSnackbar('Lỗi khi cập nhật định mức bổ sung', 'error');
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setSupplementaryStandard, showSnackbar, closeEditSupplementaryDialog]
  );
  // Derived state for license plates that have norms or are in the list of all plates
  const activeLicensePlatesWithStandards = useMemo(() => {
    const platesWithNorms = new Set([...Object.keys(dinhMucHang), ...Object.keys(dinhMucVo)]);
    allAvailableLicensePlates.forEach(p => platesWithNorms.add(p.licensePlate));
    return Array.from(platesWithNorms).map(plate => ({
      licensePlate: plate,
      // standardsHang: dinhMucHang[plate] || [], // Will be used by LicensePlateNormsCard
      // standardsVo: dinhMucVo[plate] || [],   // Will be used by LicensePlateNormsCard
    }));
  }, [dinhMucHang, dinhMucVo, allAvailableLicensePlates]);
  const openAddNewDinhMucDialog = useCallback(
    ({ licensePlate, loaiDinhMuc }) => {
      setFormData({
        bienSoXe: licensePlate || '',
        loaiDinhMuc: loaiDinhMuc || 'km_hang',
        fromKm: '0',
        toKm: '0',
        standard: '',
        note: '',
        id: null, // Ensure id is null for new entries
      });
      setErrors({});
      setCurrentStandard(null); // Explicitly set to null for 'add' mode
      setOpenAddDialog(true);
    },
    [setFormData, setErrors, setCurrentStandard, setOpenAddDialog]
  );
  const handleFormInputChange = useCallback(
    event => {
      const { name, value } = event.target;
      setFormData(prev => ({ ...prev, [name]: value }));
      // Clear error for the field being changed
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    },
    [errors, setFormData, setErrors]
  ); // errors is a dependency here
  const openEditDinhMucDialog = useCallback(
    ({ standard, licensePlate, loaiDinhMuc }) => {
      setFormData({
        id: standard.id,
        bienSoXe: standard.bien_so_xe || licensePlate, // Prefer standard.bien_so_xe, fallback to licensePlate
        loaiDinhMuc: loaiDinhMuc || 'km_hang',
        fromKm:
          standard.fromKm !== null && standard.fromKm !== undefined ? String(standard.fromKm) : '0',
        toKm: standard.toKm !== null && standard.toKm !== undefined ? String(standard.toKm) : '0',
        standard:
          standard.standard !== null && standard.standard !== undefined
            ? String(standard.standard)
            : '',
        note: standard.note || '',
      });
      setErrors({}); // Clear previous errors
      setCurrentStandard(standard); // Set the standard being edited
      setOpenEditDialog(true);
    },
    [setFormData, setErrors, setCurrentStandard, setOpenEditDialog]
  );
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.bienSoXe) newErrors.bienSoXe = 'Vui lòng chọn biển số xe';
    if (!formData.fromKm) newErrors.fromKm = 'Vui lòng nhập km bắt đầu'; // Hook uses fromKm
    if (!formData.toKm) newErrors.toKm = 'Vui lòng nhập km kết thúc'; // Hook uses toKm
    if (parseFloat(formData.fromKm) >= parseFloat(formData.toKm)) {
      newErrors.toKm = 'Km kết thúc phải lớn hơn km bắt đầu';
    }
    if (!formData.standard) newErrors.standard = 'Vui lòng nhập định mức'; // Hook uses standard
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, setErrors]);
  const handleSaveAdd = useCallback(async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      // Check for overlapping ranges
      const from = parseFloat(formData.fromKm);
      const to = parseFloat(formData.toKm);
      const currentDinhMuc = formData.loaiDinhMuc === 'km_hang' ? dinhMucHang : dinhMucVo;
      const standardsForPlate = currentDinhMuc[formData.bienSoXe] || [];
      const overlapping = standardsForPlate.some(item => {
        // Ensure item.fromKm and item.toKm are numbers for comparison
        const itemFromKm = parseFloat(item.fromKm);
        const itemToKm = parseFloat(item.toKm);
        return (
          (from >= itemFromKm && from < itemToKm) ||
          (to > itemFromKm && to <= itemToKm) ||
          (from <= itemFromKm && to >= itemToKm)
        );
      });
      if (overlapping) {
        setErrors(prev => ({
          ...prev,
          toKm: 'Khoảng km này đã được định nghĩa cho biển số xe này',
        }));
        setIsLoading(false); // Stop loading if there's an overlap error
        return;
      }
      const apiData = {
        bienSoXe: formData.bienSoXe,
        phan_loai: formData.loaiDinhMuc, // API expects phan_loai
        tuKm: parseFloat(formData.fromKm),
        denKm: parseFloat(formData.toKm),
        l_km: parseFloat(formData.standard), // API expects l_km
        ghiChu: formData.note,
      };
      await dinhMucApi.create(apiData);
      showSnackbar(
        `Thêm định mức ${formData.loaiDinhMuc === 'km_hang' ? 'hàng' : 'vỏ'} thành công`
      );
      await fetchData(); // Refresh data
      setOpenAddDialog(false); // Close dialog
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi lưu định mức', 'error'); // Generic error message
      console.error('Error saving new standard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    validateForm,
    setIsLoading,
    formData,
    dinhMucHang,
    dinhMucVo,
    setErrors,
    showSnackbar,
    fetchData,
    setOpenAddDialog,
  ]);
  const handleSaveEdit = useCallback(async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const from = parseFloat(formData.fromKm);
      const to = parseFloat(formData.toKm);
      const currentDinhMuc = formData.loaiDinhMuc === 'km_hang' ? dinhMucHang : dinhMucVo;
      const standardsForPlate = currentDinhMuc[formData.bienSoXe] || [];
      const overlapping = standardsForPlate.some(item => {
        if (item.id === formData.id) return false; // Exclude the item being edited
        const itemFromKm = parseFloat(item.fromKm);
        const itemToKm = parseFloat(item.toKm);
        return (
          (from >= itemFromKm && from < itemToKm) ||
          (to > itemFromKm && to <= itemToKm) ||
          (from <= itemFromKm && to >= itemToKm)
        );
      });
      if (overlapping) {
        setErrors(prev => ({
          ...prev,
          toKm: 'Khoảng km này đã được định nghĩa cho biển số xe này',
        }));
        setIsLoading(false); // Stop loading if there's an overlap error
        return;
      }
      const apiData = {
        id: formData.id,
        bienSoXe: formData.bienSoXe,
        phan_loai: formData.loaiDinhMuc, // API expects phan_loai
        tuKm: parseFloat(formData.fromKm),
        denKm: parseFloat(formData.toKm),
        l_km: parseFloat(formData.standard), // API expects l_km
        ghiChu: formData.note,
      };
      await dinhMucApi.update(formData.id, apiData);
      showSnackbar(`Sửa định mức ${formData.loaiDinhMuc === 'km_hang' ? 'hàng' : 'vỏ'} thành công`);
      await fetchData(); // Refresh data
      setOpenEditDialog(false);
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi sửa định mức', 'error');
      console.error('Error updating standard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    validateForm,
    setIsLoading,
    formData,
    dinhMucHang,
    dinhMucVo,
    setErrors,
    showSnackbar,
    fetchData,
    setOpenEditDialog,
  ]);
  const openDeleteDialog = useCallback(
    (id, type, details) => {
      setDeleteDialog({ open: true, id, type, details });
    },
    [setDeleteDialog]
  );
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog({ open: false, id: null, type: null, details: '' });
  }, [setDeleteDialog]);
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteDialog.id) return;
    setIsLoading(true);
    try {
      const response = await dinhMucDauApi.deleteDinhMucDau(deleteDialog.id);
      if (response.error) throw new Error(response.error);
      showSnackbar(
        `Xóa định mức ${deleteDialog.type === 'supplementary' ? 'bổ sung' : deleteDialog.type === 'km_hang' ? 'hàng' : 'vỏ'} thành công`
      );
      await fetchData(); // Refresh data
      closeDeleteDialog(); // Close dialog
    } catch (error) {
      showSnackbar('Đã xảy ra lỗi khi xóa định mức', 'error');
      console.error('Error deleting standard:', error);
    } finally {
      setIsLoading(false);
    }
  }, [deleteDialog, setIsLoading, fetchData, showSnackbar, closeDeleteDialog]);
  // TODO: Move other handlers (delete, form validation, etc.) here
  return {
    dinhMucHang,
    setDinhMucHang, // Expose setter
    dinhMucVo,
    setDinhMucVo, // Expose setter
    supplementaryStandard,
    setSupplementaryStandard, // Already exposed
    allAvailableLicensePlates, // raw list of all plates
    activeLicensePlatesWithStandards, // list of plates with standards for UI iteration
    isLoading,
    error,
    snackbar,
    showSnackbar,
    closeSnackbar, // Export closeSnackbar
    fetchData, // Keep this
    formData,
    setFormData,
    errors,
    setErrors, // Keep these
    currentStandard,
    setCurrentStandard, // Keep these
    openAddDialog,
    setOpenAddDialog,
    openAddNewDinhMucDialog,
    handleFormInputChange,
    openEditDialog,
    setOpenEditDialog,
    openEditDinhMucDialog,
    validateForm,
    handleSaveAdd,
    handleSaveEdit,
    deleteDialog, // Keep this
    openDeleteDialog, // Keep this
    closeDeleteDialog, // Keep this
    handleConfirmDelete, // Keep this
    editSupplementaryDialog, // Keep this
    openEditSupplementaryDialog, // Keep this
    closeEditSupplementaryDialog, // Keep this
    handleSaveSupplementary, // Keep this
  };
};
