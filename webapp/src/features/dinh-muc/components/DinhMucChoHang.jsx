import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  Zoom,
  Typography,
  useTheme,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';

import StandardTable from '@/components/StandardTable';
import DinhMucChoHangDialog from './DinhMucChoHangDialog'; // Assuming this dialog is suitable
import ConfirmationDialog from '@/components/ConfirmationDialog';
// import { EditButton, DeleteButton } from '@/components/ActionButtons'; // These are now part of getChoHangTableColumns
import useChoHangRecords from '../hooks/useChoHangRecords';
import { getChoHangTableColumns } from '../constants/choHangTableColumns';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi'; // For CUD operations
import SearchBar from '@/components/SearchBar';

const initialFormData = {
  bienSoXe: '',
  fromKm: '',
  toKm: '',
  standard: '',
  note: '',
  id: null, // For editing
};

const DinhMucChoHang = () => {
  const muiTheme = useTheme();
  const {
    choHangRecords,
    isLoading,
    error,
    fetchData: refetchChoHangData,
    pagination,
    searchTerm,
    handleSearchChange,
  } = useChoHangRecords();

  const [openAddEditDialog, setOpenAddEditDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, recordId: null, details: '' });
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const columns = getChoHangTableColumns(
    record => handleOpenEditDialog(record),
    record => handleDeleteClick(record),
    pagination.page,
    pagination.pageSize
  );

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setCurrentRecord(null);
    setFormData(initialFormData);
    setFormErrors({});
    setOpenAddEditDialog(true);
  };

  const handleOpenEditDialog = record => {
    setIsEdit(true);
    setCurrentRecord(record);
    setFormData({
      id: record.id,
      bienSoXe: record.bienSoXe || '',
      fromKm: record.tuKm?.toString() || '', // API: tuKm, Dialog: fromKm
      toKm: record.denKm?.toString() || '', // API: denKm, Dialog: toKm
      standard: record.l_km?.toString() || '', // API: l_km, Dialog: standard
      note: record.ghiChu || '', // API: ghiChu, Dialog: note
    });
    setFormErrors({});
    setOpenAddEditDialog(true);
  };

  const handleCloseDialog = useCallback(() => {
    setOpenAddEditDialog(false);
    setIsEdit(false);
    setCurrentRecord(null);
    setFormData(initialFormData);
    setFormErrors({});
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.bienSoXe) newErrors.bienSoXe = 'Biển số xe không được để trống';
    if (!formData.fromKm) newErrors.fromKm = 'Số km bắt đầu không được để trống';
    else if (isNaN(parseFloat(formData.fromKm))) newErrors.fromKm = 'Số km bắt đầu phải là số';
    if (!formData.toKm) newErrors.toKm = 'Số km kết thúc không được để trống';
    else if (isNaN(parseFloat(formData.toKm))) newErrors.toKm = 'Số km kết thúc phải là số';
    if (!formData.standard) newErrors.standard = 'Định mức không được để trống';
    else if (isNaN(parseFloat(formData.standard))) newErrors.standard = 'Định mức phải là số';

    if (
      formData.fromKm &&
      formData.toKm &&
      !isNaN(parseFloat(formData.fromKm)) &&
      !isNaN(parseFloat(formData.toKm))
    ) {
      const fromKmVal = parseFloat(formData.fromKm);
      const toKmVal = parseFloat(formData.toKm);
      if (fromKmVal >= toKmVal) {
        newErrors.toKm = 'Số km kết thúc phải lớn hơn số km bắt đầu';
      }
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const apiData = {
      bien_so_xe: formData.bienSoXe, // API expects bien_so_xe
      phan_loai: 'km_hang',
      tuKm: parseFloat(formData.fromKm),
      denKm: parseFloat(formData.toKm),
      l_km: parseFloat(formData.standard),
      ghiChu: formData.note,
    };

    try {
      let response;
      if (isEdit && currentRecord?.id) {
        response = await dinhMucDauApi.update(currentRecord.id, apiData);
      } else {
        response = await dinhMucDauApi.create(apiData);
      }

      if (response.success) {
        setSnackbar({
          open: true,
          message: isEdit ? 'Cập nhật thành công!' : 'Thêm mới thành công!',
          severity: 'success',
        });
        handleCloseDialog();
        refetchChoHangData();
      } else {
        setSnackbar({
          open: true,
          message: response.error?.message || 'Đã có lỗi xảy ra.',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Error saving Dinh Muc Cho Hang:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Đã có lỗi xảy ra khi lưu.',
        severity: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = record => {
    setDeleteDialog({
      open: true,
      recordId: record.id,
      details: `Bạn có chắc chắn muốn xóa định mức cho BSX ${record.bienSoXe} (Từ ${record.tuKm}km đến ${record.denKm}km)?`,
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog({ open: false, recordId: null, details: '' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.recordId) return;
    setIsSubmitting(true);
    try {
      const response = await dinhMucDauApi.delete_(deleteDialog.recordId);
      if (response.success) {
        setSnackbar({ open: true, message: 'Xóa thành công!', severity: 'success' });
        refetchChoHangData();
      } else {
        setSnackbar({
          open: true,
          message: response.error?.message || 'Lỗi khi xóa.',
          severity: 'error',
        });
      }
    } catch (err) {
      console.error('Error deleting Dinh Muc Cho Hang:', err);
      setSnackbar({ open: true, message: err.message || 'Lỗi khi xóa.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
      handleDeleteClose();
    }
  };

  const handleDialogInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Effect to update form when currentRecord changes for edit dialog
  // This was previously part of handleOpenEditDialog but can be an effect too
  useEffect(() => {
    if (isEdit && currentRecord) {
      setFormData({
        id: currentRecord.id,
        bienSoXe: currentRecord.bienSoXe || '',
        fromKm: currentRecord.tuKm?.toString() || '',
        toKm: currentRecord.denKm?.toString() || '',
        standard: currentRecord.l_km?.toString() || '',
        note: currentRecord.ghiChu || '',
      });
    } else if (!isEdit) {
      setFormData(initialFormData);
    }
  }, [isEdit, currentRecord]);

  if (isLoading && !choHangRecords.length && !error && !searchTerm) {
    // Show initial loading only
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
      </Box>
    );
  }

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
        position: 'relative',
        pb: { xs: 10, sm: 11 },
      }}
    >
      <Box sx={{ mb: 2 }}>
        <SearchBar
          value={searchTerm}
          onChange={event => handleSearchChange(event.target.value)}
          placeholder="Tìm kiếm theo biển số, ghi chú..."
          containerSx={{ width: '100%' }}
        />
      </Box>

      {error && !isLoading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StandardTable
        columns={columns}
        data={choHangRecords}
        pagination={true} // Enable pagination UI
        paginationProps={pagination} // Pass pagination data and handlers
        customRowsPerPageOptions={[5, 10, 50, 100]} // Set custom options
        isLoading={isLoading}
        dense
        noDataMessage={
          searchTerm
            ? `Không tìm thấy kết quả cho "${searchTerm}"`
            : 'Không có dữ liệu định mức chở hàng.'
        }
      />

      <DinhMucChoHangDialog
        open={openAddEditDialog}
        isEdit={isEdit}
        formData={formData}
        errors={formErrors}
        licensePlate={formData.bienSoXe}
        onClose={handleCloseDialog}
        onSave={handleSave}
        onInputChange={handleDialogInputChange}
        // onValidateForm={validateForm} // Dialog should call its own validation or rely on onSave
        isLoading={isSubmitting}
        // availableLicensePlates={[]} // This prop might not be needed if bienSoXe is a text field
      />

      <ConfirmationDialog
        open={deleteDialog.open}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        contentText={deleteDialog.details}
        confirmButtonText="Xóa"
        cancelButtonText="Hủy"
        isLoading={isSubmitting}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Zoom in={true} timeout={300} unmountOnExit>
        <Fab
          color="primary"
          aria-label="add new dinh muc cho hang"
          onClick={handleOpenAddDialog}
          sx={{
            position: 'fixed',
            bottom: { xs: 72, sm: 32 },
            right: { xs: 16, sm: 32 },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Paper>
  );
};

export default DinhMucChoHang;
