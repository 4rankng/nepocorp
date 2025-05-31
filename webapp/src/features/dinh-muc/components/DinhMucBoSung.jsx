import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Fab,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import { Add as AddIcon, Info as InfoIcon } from '@mui/icons-material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
import DeleteDialog from '@/components/DeleteDialog';
import { useDinhMucBoSung } from '../hooks/useDinhMucBoSung';
import { useConfirmation } from '@/hooks/useConfirmation';
import logger from '@services/logger';

const DinhMucBoSung = () => {
  const theme = useTheme();
  const {
    dinhMucBoSungData,
    dauKeoList,
    tuyenDuongList,
    isLoading,
    error,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useDinhMucBoSung();

  const { showConfirmation, confirmationState, handleConfirm, handleCancel } = useConfirmation();

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
    bien_so: '',
    ma_tuyen: '',
    dinh_muc_l: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to get route details
  const getRouteDetails = (ma_tuyen) => {
    if (!ma_tuyen) return { diem_di: '*', diem_den: '*' };

    if (!Array.isArray(tuyenDuongList)) {
      logger.warn('tuyenDuongList is not an array, type:', typeof tuyenDuongList);
      return { diem_di: '', diem_den: '' };
    }

    const route = tuyenDuongList.find(r => r.ma_so === ma_tuyen);
    return route ? { diem_di: route.diem_di, diem_den: route.diem_den } : { diem_di: '', diem_den: '' };
  };

  // Prepare table data with route information
  const tableData = useMemo(() => {
    return dinhMucBoSungData.map(record => {
      const { diem_di, diem_den } = getRouteDetails(record.ma_tuyen);
      return {
        ...record,
        diem_di,
        diem_den,
      };
    });
  }, [dinhMucBoSungData, tuyenDuongList]);

  // Action buttons renderer
  const renderActions = (cellValue, rowData) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <EditButton
        onClick={(e) => {
          e.stopPropagation();
          handleEdit(rowData);
        }}
        size="small"
      />
      <DeleteButton
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(rowData);
        }}
        size="small"
      />
    </Box>
  );

  // Table columns
  const columns = useMemo(() => [
    {
      key: 'bien_so',
      label: 'Biển số',
      width: '15%',
      sortable: true,
      render: (cellValue) => (
        <Typography variant="body2" fontWeight={cellValue ? 500 : 400}>
          {cellValue || '*'}
        </Typography>
      ),
    },
    {
      key: 'ma_tuyen',
      label: 'Mã tuyến',
      width: '12%',
      sortable: true,
      render: (cellValue) => (
        <Typography variant="body2" fontWeight={cellValue ? 500 : 400}>
          {cellValue || '*'}
        </Typography>
      ),
    },
    {
      key: 'diem_di',
      label: 'Điểm đi',
      width: '20%',
      sortable: true,
      render: (cellValue) => (
        <Typography variant="body2">
          {cellValue}
        </Typography>
      ),
    },
    {
      key: 'diem_den',
      label: 'Điểm đến',
      width: '25%',
      sortable: true,
      render: (cellValue) => (
        <Typography variant="body2">
          {cellValue}
        </Typography>
      ),
    },
    {
      key: 'dinh_muc_l',
      label: 'Định mức (lít)',
      width: '15%',
      align: 'right',
      sortable: true,
      render: (cellValue) => (
        <Typography variant="body2" fontWeight={500}>
          {cellValue?.toLocaleString('vi-VN')}
        </Typography>
      ),
    },
    {
      key: 'actions',
      label: 'Thao tác',
      width: '13%',
      align: 'center',
      render: renderActions,
    },
  ], []);

  // Form handlers
  const handleOpenForm = () => {
    setEditingRecord(null);
    setFormData({
      bien_so: '',
      ma_tuyen: '',
      dinh_muc_l: '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      bien_so: record.bien_so || '',
      ma_tuyen: record.ma_tuyen || '',
      dinh_muc_l: record.dinh_muc_l.toString(),
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRecord(null);
    setFormData({
      bien_so: '',
      ma_tuyen: '',
      dinh_muc_l: '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.dinh_muc_l.trim()) {
      errors.dinh_muc_l = 'Định mức không được để trống';
    } else {
      const value = parseFloat(formData.dinh_muc_l);
      if (isNaN(value) || value <= 0) {
        errors.dinh_muc_l = 'Định mức phải là số dương';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        bien_so: formData.bien_so || null,
        ma_tuyen: formData.ma_tuyen || null,
        dinh_muc_l: parseFloat(formData.dinh_muc_l),
      };

      if (editingRecord) {
        await updateRecord(editingRecord.id, submitData);
      } else {
        await createRecord(submitData);
      }

      handleCloseForm();
    } catch (err) {
      // Error is handled by the hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (record) => {
    const confirmed = await showConfirmation({
      title: 'Xác nhận xóa',
      message: `Bạn có chắc chắn muốn xóa định mức bổ sung này?`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });

    if (confirmed) {
      try {
        await deleteRecord(record.id);
      } catch (err) {
        // Error is handled by the hook
      }
    }
  };

  if (isLoading && dinhMucBoSungData.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>


      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        <StandardTable
          data={tableData}
          columns={columns}
          showSTT={true}
          loading={isLoading}
          emptyMessage="Chưa có dữ liệu định mức bổ sung"
        />
      </Paper>

      {/* FAB for adding new record */}
      <Fab
        color="primary"
        aria-label="Thêm định mức bổ sung"
        onClick={handleOpenForm}
        sx={{
          position: 'fixed',
          bottom: theme.spacing(3),
          right: theme.spacing(3),
          zIndex: theme.zIndex.fab,
        }}
      >
        <AddIcon />
      </Fab>

      {/* Form Dialog */}
      <Dialog
        open={isFormOpen}
        onClose={handleCloseForm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingRecord ? 'Sửa định mức bổ sung' : 'Thêm định mức bổ sung'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Biển số */}
            <FormControl fullWidth error={!!formErrors.bien_so}>
              <InputLabel>Biển số xe (để trống để áp dụng cho tất cả)</InputLabel>
              <Select
                value={formData.bien_so}
                onChange={(e) => setFormData(prev => ({ ...prev, bien_so: e.target.value }))}
                label="Biển số xe (để trống để áp dụng cho tất cả)"
              >
                <MenuItem value="">
                  <em>Áp dụng cho tất cả (*)</em>
                </MenuItem>
                {dauKeoList.map((dauKeo) => (
                  <MenuItem key={dauKeo.id} value={dauKeo.bien_so}>
                    {dauKeo.bien_so} - {dauKeo.mo_ta}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.bien_so && (
                <FormHelperText>{formErrors.bien_so}</FormHelperText>
              )}
            </FormControl>

            {/* Mã tuyến */}
            <FormControl fullWidth error={!!formErrors.ma_tuyen}>
              <InputLabel>Mã tuyến (để trống để áp dụng cho tất cả)</InputLabel>
              <Select
                value={formData.ma_tuyen}
                onChange={(e) => setFormData(prev => ({ ...prev, ma_tuyen: e.target.value }))}
                label="Mã tuyến (để trống để áp dụng cho tất cả)"
              >
                <MenuItem value="">
                  <em>Áp dụng cho tất cả (*)</em>
                </MenuItem>
                {tuyenDuongList.map((tuyen) => (
                  <MenuItem key={tuyen.id} value={tuyen.ma_so}>
                    {tuyen.ma_so} - {tuyen.diem_di} → {tuyen.diem_den}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.ma_tuyen && (
                <FormHelperText>{formErrors.ma_tuyen}</FormHelperText>
              )}
            </FormControl>

            {/* Định mức */}
            <TextField
              label="Định mức"
              type="number"
              value={formData.dinh_muc_l}
              onChange={(e) => setFormData(prev => ({ ...prev, dinh_muc_l: e.target.value }))}
              error={!!formErrors.dinh_muc_l}
              helperText={formErrors.dinh_muc_l}
              InputProps={{
                endAdornment: <InputAdornment position="end">lít</InputAdornment>,
                inputProps: { min: 0, step: 0.1 }
              }}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : (editingRecord ? 'Cập nhật' : 'Thêm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <DeleteDialog
        open={confirmationState.isOpen}
        title={confirmationState.title}
        message={confirmationState.message}
        confirmText={confirmationState.confirmText}
        cancelText={confirmationState.cancelText}
        confirmColor={confirmationState.confirmColor}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default DinhMucBoSung;
