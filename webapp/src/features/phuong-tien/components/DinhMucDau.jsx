import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ConfirmationDialog from '@shared/components/ConfirmationDialog';
import StandardTable from '@shared/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@shared/components/ActionButtons';
import { fuelStandardApi, vehicleApi } from '@services/mockApi';

import {
  Box,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  CircularProgress,
  Snackbar,
  Alert,
  Collapse,
  Typography,
  Grid,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ChevronDownIcon, ChevronUpIcon } from '../../../assets/icons';
import { alpha } from '@mui/material/styles';

// Theme variables
const theme = {
  spacing: 8,
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h6: { fontSize: '1rem', fontWeight: 600 },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem', color: 'text.secondary' },
  },
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#6b7280' },
    grey: { 100: '#f3f4f6', 200: '#e5e7eb' },
    success: { light: '#4caf50', main: '#2e7d32' },
    warning: { light: '#ff9800', main: '#ed6c02' },
    error: { main: '#d32f2f' },
  },
  shape: { borderRadius: 6 },
  shadows: ['none', '0px 2px 8px rgba(0, 0, 0, 0.08)', '0px 4px 12px rgba(0, 0, 0, 0.1)'],
};

// Helper functions
const spacing = value => `${value * theme.spacing}px`;

// Function to group fuel standards by license plate
const groupByLicensePlate = standards => {
  const plates = new Set();
  standards.forEach(item => plates.add(item.licensePlate));
  return Array.from(plates).map(plate => ({
    licensePlate: plate,
    standards: standards.filter(item => item.licensePlate === plate),
  }));
};

const DinhMucDau = () => {
  const [fuelStandards, setFuelStandards] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);
  const [expandedPlates, setExpandedPlates] = useState({});
  const [formData, setFormData] = useState({
    licensePlate: '',
    fromKm: '',
    toKm: '',
    standard: '',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    id: null,
    details: null,
  });
  const [orderBy, setOrderBy] = useState('fromKm');
  const [order, setOrder] = useState('asc');

  // Create a combined array of all license plates with their standards
  const allLicensePlatesWithStandards = useMemo(() => {
    // Create a map of license plates to their standards
    const standardsByLicensePlate = fuelStandards.reduce((acc, standard) => {
      if (!acc[standard.licensePlate]) {
        acc[standard.licensePlate] = [];
      }
      acc[standard.licensePlate].push(standard);
      return acc;
    }, {});

    // Combine with license plates that don't have standards yet
    return licensePlates.map(plate => ({
      licensePlate: plate.licensePlate,
      standards: standardsByLicensePlate[plate.licensePlate] || [],
    }));
  }, [fuelStandards, licensePlates]);

  // Toggle expand/collapse for a license plate
  const toggleExpand = licensePlate => {
    setExpandedPlates(prev => ({
      ...prev,
      [licensePlate]: !prev[licensePlate],
    }));
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [standardsResponse, vehiclesResponse] = await Promise.all([
        fuelStandardApi.getAll(),
        vehicleApi.getAll(),
      ]);

      const standards = standardsResponse.data || [];
      const vehicles = vehiclesResponse.data || [];

      // Extract license plates from vehicles
      const plates = vehicles.map(vehicle => ({
        id: vehicle.id,
        licensePlate: vehicle.licensePlate || vehicle.bienSoXe,
      }));

      setFuelStandards(standards);
      setLicensePlates(plates);

      // Expand first license plate by default
      if (standards.length > 0 && Object.keys(expandedPlates).length === 0) {
        setExpandedPlates({ [standards[0].licensePlate]: true });
      }
    } catch (err) {
      setError('Không thể tải dữ liệu định mức dầu');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAddDialog = licensePlate => {
    setFormData({
      fromKm: '',
      toKm: '',
      standard: '',
      note: '',
      licensePlate,
    });
    setErrors({});
    setOpenAddDialog(true);
  };

  const handleOpenEditDialog = standard => {
    setFormData({
      fromKm: standard.fromKm,
      toKm: standard.toKm,
      standard: standard.standard,
      note: standard.note || '',
      id: standard.id,
      licensePlate: standard.licensePlate,
    });
    setErrors({});
    setOpenEditDialog(true);
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fromKm) newErrors.fromKm = 'Vui lòng nhập km bắt đầu';
    if (!formData.toKm) newErrors.toKm = 'Vui lòng nhập km kết thúc';
    if (parseFloat(formData.fromKm) >= parseFloat(formData.toKm)) {
      newErrors.toKm = 'Km kết thúc phải lớn hơn km bắt đầu';
    }
    if (!formData.standard) newErrors.standard = 'Vui lòng nhập định mức';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for overlapping ranges
      const from = parseFloat(formData.fromKm);
      const to = parseFloat(formData.toKm);
      const overlapping = fuelStandards.some(item => {
        if (item.licensePlate !== formData.licensePlate) return false;
        return (
          (from >= item.fromKm && from < item.toKm) ||
          (to > item.fromKm && to <= item.toKm) ||
          (from <= item.fromKm && to >= item.toKm)
        );
      });

      if (overlapping) {
        setErrors(prev => ({
          ...prev,
          toKm: 'Khoảng km này đã được định nghĩa cho biển số xe này',
        }));
        return;
      }

      await fuelStandardApi.create(formData);
      showSnackbar('Thêm định mức dầu thành công');
      await fetchData();
      setOpenAddDialog(false);
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi lưu định mức dầu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for overlapping ranges, excluding current item
      const from = parseFloat(formData.fromKm);
      const to = parseFloat(formData.toKm);
      const overlapping = fuelStandards.some(item => {
        if (item.id === formData.id) return false; // Skip current item
        if (item.licensePlate !== formData.licensePlate) return false;
        return (
          (from >= item.fromKm && from < item.toKm) ||
          (to > item.fromKm && to <= item.toKm) ||
          (from <= item.fromKm && to >= item.toKm)
        );
      });

      if (overlapping) {
        setErrors(prev => ({
          ...prev,
          toKm: 'Khoảng km này đã được định nghĩa cho biển số xe này',
        }));
        return;
      }

      await fuelStandardApi.update(formData.id, formData);
      showSnackbar('Cập nhật định mức dầu thành công');
      await fetchData();
      setOpenEditDialog(false);
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi cập nhật định mức dầu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = id => {
    const itemToDelete = fuelStandards.find(item => item.id === id);
    if (!itemToDelete) return;

    setDeleteDialog({
      open: true,
      id,
      details: {
        'Biển số xe': itemToDelete.licensePlate,
        'Từ km': itemToDelete.fromKm.toLocaleString(),
        'Đến km': itemToDelete.toKm.toLocaleString(),
        'Định mức (l/km)': itemToDelete.standard,
        'Ghi chú': itemToDelete.note || 'Không có',
      },
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.id) return;
    setDeleteDialog(prev => ({ ...prev, isDeleting: true }));

    setIsLoading(true);
    try {
      await fuelStandardApi.delete(deleteDialog.id);
      showSnackbar('Xóa định mức dầu thành công');
      await fetchData();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa định mức dầu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
      setDeleteDialog({ open: false, id: null });
    }
  };

  const handleDeleteClose = useCallback(() => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  }, []);

  const renderDialog = (isEdit = false) => {
    const open = isEdit ? openEditDialog : openAddDialog;
    const handleClose = isEdit ? () => setOpenEditDialog(false) : () => setOpenAddDialog(false);
    const handleSave = isEdit ? handleSaveEdit : handleSaveAdd;

    return (
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiPaper-root': {
            width: '100%',
            maxWidth: '480px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            margin: '16px',
          },
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
          },
        }}
        onKeyDown={e => e.key === 'Escape' && handleClose()}
        onClick={e => e.target === e.currentTarget && handleClose()}
      >
        <DialogTitle
          sx={{
            p: '16px 24px',
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            '& .MuiTypography-root': {
              fontSize: '1.125rem',
              fontWeight: 600,
              color: 'text.primary',
              lineHeight: 1.4,
              m: 0,
            },
          }}
        >
          {isEdit ? 'Chỉnh sửa định mức dầu' : 'Thêm định mức dầu mới'}
          <IconButton
            aria-label="close"
            onClick={handleClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{
            p: '24px',
            '&.MuiDialogContent-root': {
              paddingTop: '16px',
            },
          }}
        >
          <DialogContentText
            sx={{
              mb: '20px',
              color: 'text.secondary',
              fontSize: '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {isEdit
              ? 'Cập nhật thông tin định mức dầu cho phương tiện.'
              : 'Nhập thông tin định mức dầu mới cho phương tiện.'}
          </DialogContentText>

          <Box component="form" noValidate autoComplete="off" sx={{ '& > :not(style)': { mb: 2 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}
                >
                  Phạm vi số km
                </Typography>
                <Grid container spacing={2} sx={{ mb: 1, display: 'flex', flexWrap: 'nowrap' }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Từ km"
                      name="fromKm"
                      type="number"
                      value={formData.fromKm}
                      onChange={handleInputChange}
                      onBlur={validateForm}
                      error={!!errors.fromKm}
                      helperText={errors.fromKm || ''}
                      variant="outlined"
                      margin="none"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        min: 0,
                        step: 1,
                        style: {
                          textAlign: 'right',
                          height: '40px',
                          padding: '8px 12px',
                          boxSizing: 'border-box',
                          fontSize: '0.875rem',
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end" sx={{ color: 'text.secondary' }}>
                            km
                          </InputAdornment>
                        ),
                        sx: {
                          '&.Mui-focused': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '1px',
                            },
                          },
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'text.secondary',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Đến km"
                      name="toKm"
                      type="number"
                      value={formData.toKm}
                      onChange={handleInputChange}
                      onBlur={validateForm}
                      error={!!errors.toKm}
                      helperText={errors.toKm || ''}
                      variant="outlined"
                      margin="none"
                      InputLabelProps={{
                        shrink: true,
                      }}
                      inputProps={{
                        min: 1,
                        step: 1,
                        style: {
                          textAlign: 'right',
                          height: '40px',
                          padding: '8px 12px',
                          boxSizing: 'border-box',
                          fontSize: '0.875rem',
                        },
                      }}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end" sx={{ color: 'text.secondary' }}>
                            km
                          </InputAdornment>
                        ),
                        sx: {
                          '&.Mui-focused': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                              borderWidth: '1px',
                            },
                          },
                        },
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'text.secondary',
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={4}>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 1, color: 'text.secondary', fontWeight: 500 }}
                >
                  Định mức nhiên liệu
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder=""
                  name="standard"
                  type="number"
                  value={formData.standard}
                  onChange={handleInputChange}
                  onBlur={validateForm}
                  error={!!errors.standard}
                  helperText={errors.standard || ''}
                  variant="outlined"
                  margin="none"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    step: '0.01',
                    min: '0.01',
                    style: {
                      textAlign: 'right',
                      height: '40px',
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      fontSize: '0.875rem',
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end" sx={{ color: 'text.secondary' }}>
                        lít/km
                      </InputAdornment>
                    ),
                    sx: {
                      '&.Mui-focused': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                          borderWidth: '1px',
                        },
                      },
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sx={{ width: '100%' }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Ghi chú (tùy chọn)"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  variant="outlined"
                  margin="none"
                  multiline
                  rows={4}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    style: {
                      padding: '12px',
                      boxSizing: 'border-box',
                      width: '100%',
                      fontSize: '0.875rem',
                    },
                  }}
                  sx={{
                    width: '100%',
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'text.secondary',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: '1px',
                      },
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: '16px 24px',
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'flex-end',
            gap: '12px',
            '& > *': {
              margin: '0 !important',
            },
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            color="inherit"
            size="small"
            sx={{
              height: '36px',
              px: '16px',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'text.primary',
              borderColor: 'action.disabled',
              borderRadius: '6px',
              textTransform: 'none',
              '&:hover': {
                borderColor: 'text.secondary',
                backgroundColor: 'action.hover',
              },
              '&:active': {
                backgroundColor: 'action.selected',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            size="small"
            disabled={isLoading}
            sx={{
              height: '36px',
              px: '20px',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '6px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                backgroundColor: 'primary.dark',
              },
              '&:active': {
                boxShadow: 'none',
                backgroundColor: 'primary.dark',
              },
              '&.Mui-disabled': {
                backgroundColor: 'action.disabledBackground',
                color: 'text.disabled',
              },
            }}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isLoading ? 'Đang xử lý...' : isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mt: 2 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {error}
          </Alert>
        ) : allLicensePlatesWithStandards.length === 0 ? (
          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
            Chưa có dữ liệu biển số xe. Vui lòng thêm biển số xe trước.
          </Alert>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allLicensePlatesWithStandards.map(({ licensePlate, standards }) => (
              <Paper
                key={licensePlate}
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
              >
                <Box
                  onClick={() => toggleExpand(licensePlate)}
                  sx={{
                    p: spacing(1.5),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                      '& .MuiTypography-root': {
                        color: theme.palette.primary.main,
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {licensePlate}
                      </Typography>
                      {standards.length > 0 && (
                        <Box
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            borderRadius: '12px',
                            px: 1,
                            py: 0.25,
                            fontSize: '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {standards.length} mức
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddButton
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenAddDialog(licensePlate);
                        }}
                        className="h-7 min-w-0 p-1"
                        sx={{ minWidth: '28px' }}
                      />
                      {expandedPlates[licensePlate] ? (
                        <ChevronUpIcon className="w-5 h-5" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5" />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Collapse in={expandedPlates[licensePlate] !== false} timeout="auto" unmountOnExit>
                  <Box sx={{ p: spacing(1.5) }}>
                    <StandardTable
                      columns={[
                        {
                          key: 'range',
                          label: 'Đoạn đường (km)',
                          render: (_, row) =>
                            `${row.fromKm.toLocaleString()} - ${row.toKm.toLocaleString()}`,
                        },
                        {
                          key: 'fromKm',
                          label: 'Từ (km)',
                          numeric: true,
                          render: value => value.toLocaleString(),
                        },
                        {
                          key: 'toKm',
                          label: 'Đến (km)',
                          numeric: true,
                          render: value => value.toLocaleString(),
                        },
                        {
                          key: 'standard',
                          label: 'Định mức (l/km)',
                          numeric: true,
                          render: value => value.toFixed(2),
                          getColor: value =>
                            value > 0.4
                              ? theme.palette.error.main
                              : value > 0.3
                                ? theme.palette.warning.main
                                : theme.palette.success.main,
                          fontWeight: 500,
                        },
                        {
                          key: 'note',
                          label: 'Ghi chú',
                          maxWidth: 200,
                          noWrap: true,
                          render: value => value || 'Không có ghi chú',
                          getColor: value => (value ? 'text.primary' : 'text.disabled'),
                        },
                      ]}
                      data={standards.sort((a, b) => a.fromKm - b.fromKm)}
                      renderActions={row => (
                        <>
                          <EditButton
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEditDialog(row);
                            }}
                          />
                          <DeleteButton
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteClick(row.id);
                            }}
                          />
                        </>
                      )}
                      emptyMessage="Chưa có dữ liệu định mức dầu"
                    />
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      {/* Render dialogs */}
      {renderDialog()}
      {renderDialog(true)}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa định mức dầu"
        message="Bạn có chắc chắn muốn xóa định mức dầu này?"
        details={deleteDialog.details}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default DinhMucDau;
