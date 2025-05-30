import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Paper, Alert, useTheme } from '@mui/material';
import { SearchBar } from '@components';
import DinhMucTheoBienSoXeSection from './DinhMucTheoBienSoXeSection';
import DinhMucVoRongDialog from './DinhMucVoRongDialog';
import { ConfirmationDialog } from '@components';
import { useVoRong } from '../hooks';
const DinhMucVoRong = () => {
  const muiTheme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);
  const [deleteDetails, setDeleteDetails] = useState({ id: null, type: null, details: '' });
  // Form states
  const [formData, setFormData] = useState({
    bienSoXe: '',
    fromKm: '',
    toKm: '',
    standard: '',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [selectedLicensePlate, setSelectedLicensePlate] = useState('');
  const {
    dinhMucVoRong,
    availableLicensePlates,
    isLoading,
    error,
    createVoRongStandard,
    updateVoRongStandard,
    deleteVoRongStandard,
  } = useVoRong();
  // Convert the license plates data to match the expected format
  const activeLicensePlatesWithStandards = availableLicensePlates;
  const openAddNewDinhMucDialog = params => {
    setCurrentStandard(null);
    setSelectedLicensePlate(params?.licensePlate || '');
    setFormData({
      bienSoXe: params?.licensePlate || '',
      fromKm: '',
      toKm: '',
      standard: '',
      note: '',
    });
    setErrors({});
    setAddDialogOpen(true);
  };
  const openEditDinhMucDialog = params => {
    const { standard, licensePlate } = params;
    setCurrentStandard(standard);
    setSelectedLicensePlate(licensePlate);
    setFormData({
      bienSoXe: licensePlate,
      fromKm: standard.fromKm?.toString() || '',
      toKm: standard.toKm?.toString() || '',
      standard: standard.standard?.toString() || '',
      note: standard.note || '',
    });
    setErrors({});
    setEditDialogOpen(true);
  };
  const openDeleteDialog = (id, type, details) => {
    setDeleteDetails({ id, type, details });
    setDeleteDialogOpen(true);
  };
  const handleTriggerDeleteDialog = (id, type, item, licensePlate) => {
    let detailsText = '';
    const plateIdText = licensePlate ? `cho BSX ${licensePlate}` : '';
    if (type === 'km_vo') {
      detailsText = `định mức vỏ (Từ ${item.fromKm}km đến ${item.toKm}km) ${plateIdText}`;
    } else {
      detailsText = 'định mức đã chọn'; // Fallback
    }
    openDeleteDialog(id, type, detailsText);
  };
  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };
  const validateForm = () => {
    const newErrors = {};
    if (!formData.bienSoXe) newErrors.bienSoXe = 'Biển số xe không được để trống';
    if (!formData.fromKm) newErrors.fromKm = 'Số km bắt đầu không được để trống';
    if (!formData.toKm) newErrors.toKm = 'Số km kết thúc không được để trống';
    if (!formData.standard) newErrors.standard = 'Định mức không được để trống';
    if (formData.fromKm && formData.toKm) {
      const fromKm = parseFloat(formData.fromKm);
      const toKm = parseFloat(formData.toKm);
      if (fromKm >= toKm) {
        newErrors.toKm = 'Số km kết thúc phải lớn hơn số km bắt đầu';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      if (currentStandard) {
        await updateVoRongStandard(currentStandard.id, formData);
        setEditDialogOpen(false);
      } else {
        await createVoRongStandard(formData);
        setAddDialogOpen(false);
      }
      // Reset form
      setFormData({
        bienSoXe: '',
        fromKm: '',
        toKm: '',
        standard: '',
        note: '',
      });
    } catch (err) {
      console.error('Error saving định mức:', err);
    }
  };
  const handleDelete = async () => {
    try {
      await deleteVoRongStandard(deleteDetails.id);
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting định mức:', err);
    }
  };
  const handleCloseDialog = () => {
    setAddDialogOpen(false);
    setEditDialogOpen(false);
    setFormData({
      bienSoXe: '',
      fromKm: '',
      toKm: '',
      standard: '',
      note: '',
    });
    setErrors({});
  };
  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
      }}
    >
      {isLoading ? (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || error.toString()}
        </Alert>
      ) : (
        <Box>
          <Box
            sx={{
              mb: 2,
            }}
          >
            <SearchBar
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm biển số xe..."
            />
          </Box>
          <DinhMucTheoBienSoXeSection
            dinhMucHang={[]} // Empty array since we're only showing km_vo
            dinhMucVo={dinhMucVoRong}
            activeLicensePlatesWithStandards={activeLicensePlatesWithStandards}
            isLoading={isLoading}
            error={error ? error.message || 'Lỗi không xác định' : null}
            searchQuery={searchQuery}
            onOpenAddNewDialog={openAddNewDinhMucDialog}
            onOpenEditDialog={openEditDinhMucDialog}
            onOpenDeleteDialog={handleTriggerDeleteDialog}
            normTypeFilter="km_vo" // Only show km_vo standards
          />
        </Box>
      )}
      {/* Add/Edit Dialog */}
      <DinhMucVoRongDialog
        open={addDialogOpen || editDialogOpen}
        isEdit={!!currentStandard}
        formData={formData}
        errors={errors}
        licensePlate={selectedLicensePlate}
        onClose={handleCloseDialog}
        onSave={handleSave}
        onInputChange={handleInputChange}
        onValidateForm={validateForm}
      />
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${deleteDetails.details}?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Paper>
  );
};
export default DinhMucVoRong;
