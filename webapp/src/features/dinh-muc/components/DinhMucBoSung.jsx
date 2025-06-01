import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, useTheme, Fab, Alert, CircularProgress } from '@mui/material';
import { Add as AddIcon, Warning as WarningIcon } from '@mui/icons-material';
import AsteriskCell from '@/components/AsteriskCell';
import AddEditDinhMucBoSung from './AddEditDinhMucBoSung';
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
  const getRouteDetails = ma_tuyen => {
    if (!ma_tuyen) return { diem_di: '*', diem_den: '*' };

    if (!Array.isArray(tuyenDuongList)) {
      logger.warn('tuyenDuongList is not an array, type:', typeof tuyenDuongList);
      return { diem_di: '', diem_den: '' };
    }

    const route = tuyenDuongList.find(r => r.ma_so === ma_tuyen);
    return route
      ? { diem_di: route.diem_di, diem_den: route.diem_den }
      : { diem_di: '', diem_den: '' };
  };

  // Prepare table data with route information
  const tableData = useMemo(() => {
    return dinhMucBoSungData.map(record => {
      // If ma_tuyen is not set, use asterisks for diem_di and diem_den
      if (!record.ma_tuyen) {
        return {
          ...record,
          diem_di: '*',
          diem_den: '*',
        };
      }

      const { diem_di, diem_den } = getRouteDetails(record.ma_tuyen);
      return {
        ...record,
        diem_di: diem_di || '*',
        diem_den: diem_den || '*',
      };
    });
  }, [dinhMucBoSungData, tuyenDuongList]);

  // Action buttons renderer
  const renderActions = (cellValue, rowData) => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <EditButton
        onClick={e => {
          e.stopPropagation();
          handleEdit(rowData);
        }}
        size="small"
      />
      <DeleteButton
        onClick={e => {
          e.stopPropagation();
          handleDelete(rowData);
        }}
        size="small"
      />
    </Box>
  );

  // Table columns
  const columns = useMemo(
    () => [
      {
        key: 'bien_so',
        label: 'Biển số',
        width: '20%',
        sortable: true,
        render: cellValue => (
          <AsteriskCell value={cellValue || '*'} tooltip="Áp dụng cho tất cả biển số" />
        ),
      },
      {
        key: 'diem_di',
        label: 'Điểm đi',
        width: '30%',
        sortable: true,
        render: cellValue => (
          <AsteriskCell value={cellValue} tooltip="Áp dụng cho tất cả điểm đi" />
        ),
      },
      {
        key: 'diem_den',
        label: 'Điểm đến',
        width: '30%',
        sortable: true,
        render: cellValue => (
          <AsteriskCell value={cellValue} tooltip="Áp dụng cho tất cả điểm đến" />
        ),
      },
      {
        key: 'dinh_muc_l',
        label: 'Định mức (lít)',
        width: '15%',
        align: 'right',
        sortable: true,
        render: cellValue => (
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
    ],
    []
  );

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

  const handleEdit = record => {
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
      title: 'Xóa định mức bổ sung',
      message: 'Bạn có chắc chắn muốn xóa định mức bổ sung này?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      data: record, // Pass the record data to show in the dialog
      type: 'delete',
      confirmColor: 'error',
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
      <AddEditDinhMucBoSung
        open={isFormOpen}
        onClose={handleCloseForm}
        formData={formData}
        setFormData={setFormData}
        formErrors={formErrors}
        isSubmitting={isSubmitting}
        editingRecord={editingRecord}
        dauKeoList={dauKeoList}
        tuyenDuongList={tuyenDuongList}
        onSubmit={handleSubmit}
      />


      <DeleteDialog
        open={confirmationState.isOpen}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            <span>{confirmationState.title || 'Xác nhận xóa'}</span>
          </Box>
        }
        message={confirmationState.message}
        details={confirmationState.data ? {
          'Biển số': confirmationState.data.bien_so === '*' ? 'Tất cả' : confirmationState.data.bien_so,
          'Điểm đi': confirmationState.data.diem_di === '*' ? 'Tất cả' : confirmationState.data.diem_di,
          'Điểm đến': confirmationState.data.diem_den === '*' ? 'Tất cả' : confirmationState.data.diem_den,
        } : null}
        confirmText={confirmationState.confirmText || 'Xóa'}
        cancelText={confirmationState.cancelText || 'Hủy'}
        confirmColor="error"
        type="delete"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default DinhMucBoSung;
