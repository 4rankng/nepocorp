import React, { useState, useEffect, useCallback } from 'react';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import { dauKeoApi, roMoocApi } from '@services/mockApi';

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
  CircularProgress,
  Snackbar,
  Alert,
  Typography,
  Grid,
  IconButton,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Card,
  CardContent,
  Chip,
  useMediaQuery,
  useTheme,
  InputAdornment,
  Divider,
  Fab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Vehicle types for dropdown
const vehicleTypes = [
  { value: 'truck', label: 'Xe tải' },
  { value: 'container', label: 'Xe container' },
  { value: 'tractor', label: 'Đầu kéo' },
  { value: 'trailer', label: 'Rơ moóc' },
];

const XeVanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    vehicleId: null,
    details: '',
  });

  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: '',
    note: '',
  });

  const [errors, setErrors] = useState({});

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const response = await vehicleApi.getAll();
      setVehicles(response.data || []);
      setError('');
    } catch (err) {
      setError('Không thể tải danh sách phương tiện');
      showSnackbar('Đã xảy ra lỗi khi tải dữ liệu', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  // Filter vehicles based on search term
  const filteredVehicles = React.useMemo(() => {
    if (!searchTerm.trim()) return vehicles;
    const search = searchTerm.toLowerCase();
    return vehicles.filter(vehicle => {
      const licensePlate = (vehicle.licensePlate || vehicle.bienSo || '').toLowerCase();
      const vehicleTypeLabel =
        vehicleTypes.find(t => t.value === vehicle.vehicleType)?.label || vehicle.vehicleType || '';
      const note = (vehicle.note || '').toLowerCase();
      return (
        licensePlate.includes(search) ||
        vehicleTypeLabel.toLowerCase().includes(search) ||
        note.includes(search)
      );
    });
  }, [vehicles, searchTerm]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseDialog = useCallback(() => {
    setFormData({
      licensePlate: '',
      vehicleType: '',
      note: '',
    });
    setErrors({});
    setIsEdit(false);
    setOpenDialog(false);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Vui lòng nhập biển số xe';
    }

    if (!formData.vehicleType) {
      newErrors.vehicleType = 'Vui lòng chọn loại xe';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenAddDialog = () => {
    setIsEdit(false);
    setFormData({
      licensePlate: '',
      vehicleType: '',
      note: '',
    });
    setErrors({});
    setOpenDialog(true);
  };

  const handleOpenEditDialog = vehicle => {
    setIsEdit(true);
    setFormData({
      licensePlate: vehicle.licensePlate || vehicle.bienSo,
      vehicleType: vehicle.vehicleType || 'truck',
      note: vehicle.note || '',
      id: vehicle.id,
    });
    setErrors({});
    setOpenDialog(true);
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

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isEdit) {
        await vehicleApi.update(formData.id, formData);
        showSnackbar('Sửa thông tin xe thành công');
      } else {
        await vehicleApi.create(formData);
        showSnackbar('Thêm xe mới thành công');
      }
      await fetchVehicles();
      handleCloseDialog();
    } catch (err) {
      const errorMessage = isEdit
        ? 'Đã xảy ra lỗi khi sửa thông tin xe'
        : 'Đã xảy ra lỗi khi thêm xe mới';
      showSnackbar(errorMessage, 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = vehicle => {
    setDeleteDialog({
      open: true,
      vehicleId: vehicle.id,
      details: `Bạn có chắc chắn muốn xóa phương tiện ${vehicle.licensePlate || vehicle.bienSo}?`,
    });
  };

  const handleDeleteClose = () => {
    setDeleteDialog(prev => ({ ...prev, open: false }));
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.vehicleId) return;

    setIsLoading(true);
    try {
      await vehicleApi.delete(deleteDialog.vehicleId);
      showSnackbar('Xóa phương tiện thành công');
      await fetchVehicles();
      handleDeleteClose();
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi xóa phương tiện', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile Vehicle Card Component
  const MobileVehicleCard = ({ vehicle }) => {
    const vehicleTypeLabel =
      vehicleTypes.find(t => t.value === vehicle.vehicleType)?.label || vehicle.vehicleType || '';

    return (
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
          {/* Header with License Plate, Vehicle Type Chip and Actions */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography
                variant="h6"
                sx={{
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: '#1976d2',
                  letterSpacing: '0.5px',
                }}
              >
                {vehicle.licensePlate || vehicle.bienSo || 'N/A'}
              </Typography>
              <Chip
                label={vehicleTypeLabel}
                size="small"
                sx={{
                  backgroundColor: '#1976d2',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  height: '24px',
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  handleOpenEditDialog(vehicle);
                }}
                sx={{
                  color: '#666',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                    color: '#1976d2',
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteClick(vehicle);
                }}
                sx={{
                  color: '#666',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.04)',
                    color: '#d32f2f',
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Information Rows */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* First Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    fontSize: '0.875rem',
                    mb: 0.5,
                  }}
                >
                  Loại xe
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#333',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {vehicleTypeLabel || 'Chưa xác định'}
                </Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#666',
                    fontSize: '0.875rem',
                    mb: 0.5,
                  }}
                >
                  Ghi chú
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#333',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  {vehicle.note || 'Không có'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render mobile view
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
      {filteredVehicles.map(vehicle => (
        <MobileVehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
      {!isLoading && filteredVehicles.length === 0 && (
        <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
          {searchTerm ? 'Không tìm thấy phương tiện phù hợp' : 'Không có dữ liệu phương tiện'}
        </Typography>
      )}
    </Box>
  );

  // Render desktop view
  const renderDesktopView = () => (
    <StandardTable
      columns={[
        {
          key: 'licensePlate',
          label: 'BIỂN SỐ XE',
          render: (value, row) => value || row.bienSo || '',
        },
        {
          key: 'vehicleType',
          label: 'LOẠI XE',
          render: value => {
            const type = vehicleTypes.find(t => t.value === value);
            return type ? type.label : value || '';
          },
        },
        {
          key: 'note',
          label: 'GHI CHÚ',
          render: value => value || '',
        },
      ]}
      data={filteredVehicles}
      loading={isLoading}
      emptyMessage={
        searchTerm ? 'Không tìm thấy phương tiện phù hợp' : 'Không có dữ liệu phương tiện'
      }
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
              handleDeleteClick(row);
            }}
          />
        </>
      )}
    />
  );

  const renderDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative',
            overflow: 'hidden',
            margin: isMobile ? 2 : 3,
            width: isMobile ? 'calc(100% - 32px)' : 'auto',
            maxHeight: isMobile ? 'calc(100vh - 64px)' : '90vh',
          },
        }}
      >
        <IconButton
          onClick={handleCloseDialog}
          size="small"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ p: isMobile ? 2 : 3, pt: isMobile ? 2.5 : 4 }}>
          <Box
            component="form"
            noValidate
            autoComplete="off"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            <DialogContentText
              sx={{
                mb: 3,
                color: 'text.primary',
                fontSize: '0.875rem',
                lineHeight: 1.5,
              }}
            >
              {isEdit ? 'Sửa thông tin.' : 'Nhập thông tin mới.'}
            </DialogContentText>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  flexDirection: { xs: 'column', sm: 'row' },
                }}
              >
                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Biển số xe *"
                    name="licensePlate"
                    value={formData.licensePlate}
                    onChange={handleInputChange}
                    error={!!errors.licensePlate}
                    helperText={errors.licensePlate || 'Ví dụ: 30A-12345'}
                    variant="outlined"
                    placeholder="Nhập biển số xe"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                        '&.Mui-focused': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 2,
                          },
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontWeight: 500,
                      },
                    }}
                  />
                </Box>

                <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
                  <FormControl
                    fullWidth
                    size="small"
                    error={!!errors.vehicleType}
                    sx={{
                      '& .MuiInputBase-root': {
                        fontSize: '0.875rem',
                        '& .MuiSelect-select': {
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                        },
                      },
                      width: '100%',
                    }}
                  >
                    <InputLabel
                      id="vehicle-type-label"
                      shrink
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        '&.Mui-focused': {
                          color: 'text.primary',
                        },
                      }}
                    >
                      Loại xe *
                    </InputLabel>
                    <Select
                      labelId="vehicle-type-label"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      displayEmpty
                      label="Loại xe *"
                      sx={{
                        width: '100%',
                        minWidth: '200px',
                        borderRadius: 2,
                        backgroundColor: 'background.paper',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'primary.main',
                          },
                        },
                        '&.Mui-focused': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderWidth: 2,
                            borderColor: 'primary.main',
                          },
                        },
                        '& .MuiSelect-select': {
                          minHeight: 'auto',
                          height: 'auto',
                          padding: '8.5px 14px',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                        },
                        '& .MuiOutlinedInput-root': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.23)',
                          },
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            marginTop: 1,
                            borderRadius: 2,
                            boxShadow: 3,
                            '& .MuiMenuItem-root': {
                              fontSize: '0.875rem',
                              padding: '8px 16px',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            },
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        <Box
                          sx={{
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            fontSize: '0.875rem',
                          }}
                        >
                          Chọn loại xe
                        </Box>
                      </MenuItem>
                      {vehicleTypes.map(type => (
                        <MenuItem
                          key={type.value}
                          value={type.value}
                          sx={{
                            fontSize: '0.875rem',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                            },
                          }}
                        >
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.vehicleType && (
                      <FormHelperText error sx={{ ml: 1.5, mt: 0.5 }}>
                        {errors.vehicleType}
                      </FormHelperText>
                    )}
                  </FormControl>
                </Box>
              </Box>

              <TextField
                fullWidth
                size="small"
                label="Ghi chú"
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                variant="outlined"
                multiline
                rows={3}
                placeholder="Nhập ghi chú (tùy chọn)"
                InputLabelProps={{
                  shrink: true,
                }}
                InputProps={{
                  sx: {
                    '& textarea': {
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      resize: 'vertical',
                    },
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    backgroundColor: 'background.paper',
                    '&:hover': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      },
                    },
                    '&.Mui-focused': {
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderWidth: 2,
                      },
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontWeight: 500,
                  },
                }}
              />
            </Box>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            p: isMobile ? '12px 16px' : '16px 24px',
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
            justifyContent: 'flex-end',
            gap: '12px',
            '& > *': {
              margin: '0 !important',
            },
          }}
        >
          <Button
            onClick={handleCloseDialog}
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
            }}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isLoading ? 'Đang xử lý...' : isEdit ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo biển số, loại xe hoặc ghi chú..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      {/* Loading state */}
      {isLoading && (
        <Box textAlign="center" py={4}>
          <Typography>Đang tải dữ liệu...</Typography>
        </Box>
      )}
      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}
      {/* Content */}
      {!isLoading && !error && <>{isMobile ? renderMobileView() : renderDesktopView()}</>}
      {/* FAB for add at bottom right (always visible) */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleOpenAddDialog}
        disabled={isLoading}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, md: 32 },
          right: { xs: 24, md: 32 },
          zIndex: 1201,
          boxShadow: 6,
        }}
      >
        <AddIcon />
      </Fab>
      {/* Render dialogs */}
      {renderDialog()}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{
          vertical: isMobile ? 'bottom' : 'top',
          horizontal: isMobile ? 'center' : 'right',
        }}
        sx={isMobile ? { bottom: 90 } : {}}
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
        title=""
        message={deleteDialog.details}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
        hideHeader={true}
      />
    </Box>
  );
};

export default XeVanChuyen;
