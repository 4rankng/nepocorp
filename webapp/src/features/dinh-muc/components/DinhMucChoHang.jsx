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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';

import StandardTable from '@/components/StandardTable';
import DeleteDialog from '@/components/DeleteDialog';
// import { EditButton, DeleteButton } from '@/components/ActionButtons'; // These are now part of getChoHangTableColumns
import { useChoHang } from '../hooks/useChoHang';
import { getChoHangTableColumns } from '../constants/choHangTableColumns';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi'; // For CUD operations
import logger from '@/services/logger';

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
    licensePlates,
    pagination,
    searchTerm,
    selectedPlate,
    handleSearchChange,
    handlePlateChange: hookHandlePlateChange,
  } = useChoHang();

  const [openAddEditDialog, setOpenAddEditDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentRecord, setCurrentRecord] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, recordId: null, details: null });
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
      details: {
        'Biển số xe': record.bienSoXe,
        'Từ km': `${record.tuKm}km`,
        'Đến km': `${record.denKm}km`,
        'Định mức': `${record.l_km}l/km`,
      },
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog({ open: false, recordId: null, details: null });
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
        logger.error('Error deleting record:', response.error);
        setSnackbar({
          open: true,
          message: response.error?.message || 'Lỗi khi xóa.',
          severity: 'error',
        });
      }
    } catch (err) {
      logger.error('Error in delete operation:', err);
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

  // Handler for license plate dropdown
  const handlePlateChange = event => {
    const plate = event.target.value;
    if (plate === 'Tất cả') {
      hookHandlePlateChange('');
    } else {
      hookHandlePlateChange(plate);
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
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          sx={{ width: '50%' }}
          variant="outlined"
          placeholder="Tìm kiếm theo biển số, ghi chú..."
          value={searchTerm}
          onChange={event => handleSearchChange(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '6px',
              height: 36,
              minHeight: 36,
              fontSize: '0.95rem',
            },
          }}
        />
        <FormControl sx={{ minWidth: 180 }} size="small" variant="outlined">
          <InputLabel id="plate-select-label">Biển số xe</InputLabel>
          <Select
            labelId="plate-select-label"
            id="plate-select"
            value={selectedPlate || 'Tất cả'}
            onChange={handlePlateChange}
            label="Biển số xe"
            renderValue={selected => {
              if (!selected || selected === 'Tất cả') return 'Tất cả';
              return selected;
            }}
          >
            <MenuItem key="all" value="Tất cả">
              <em>Tất cả</em>
            </MenuItem>
            {licensePlates.map(plate => (
              <MenuItem key={plate.id} value={plate.bien_so}>
                {plate.bien_so}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && !isLoading && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StandardTable
        columns={columns}
        data={choHangRecords}
        loading={isLoading}
        error={error}
        emptyMessage={
          searchTerm || selectedPlate
            ? `Không tìm thấy kết quả cho "${selectedPlate || searchTerm}"`
            : 'Không có dữ liệu định mức chở hàng.'
        }
        pagination={true}
        page={pagination.page}
        rowsPerPage={pagination.pageSize}
        totalCount={pagination.total}
        rowKeyField="id"
        onPageChange={(_, newPage) => {
          pagination.onPageChange(_, newPage);
        }}
        onRowsPerPageChange={event => {
          pagination.onRowsPerPageChange(event);
        }}
      />

      <DeleteDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        details={deleteDialog.details}
        isLoading={isSubmitting}
        type="delete"
        title="Xóa định mức chở hàng"
        message="Bạn có chắc chắn muốn xóa định mức này?"
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Zoom in={!isSubmitting}>
        <Fab
          color="primary"
          aria-label="Thêm mới"
          onClick={handleOpenAddDialog}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            boxShadow: 3,
            '&:hover': {
              boxShadow: 6,
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Paper>
  );
};

export default DinhMucChoHang;
