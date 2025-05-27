import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
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
  Chip,
  Card,
  CardContent,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ChevronDownIcon, ChevronUpIcon } from '@assets/icons';
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
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [fuelStandards, setFuelStandards] = useState([]);
  const [licensePlates, setLicensePlates] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);
  // Initialize with the first license plate expanded by default on mobile

  const [expandedCards, setExpandedCards] = useState({});
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

  // Initialize all cards as collapsed by default
  const [expandedPlates, setExpandedPlates] = useState({});

  // Toggle expand/collapse for a license plate
  const toggleExpand = licensePlate => {
    setExpandedPlates(prev => {
      return {
        ...prev,
        [licensePlate]: !prev[licensePlate],
      };
    });
  };

  // Toggle expand/collapse for individual cards on mobile
  const toggleCardExpand = cardId => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  // Mobile Card Component for individual fuel standards
  const MobileFuelStandardCard = ({ standard, licensePlate }) => {
    const cardId = `${licensePlate}-${standard.id}`;
    const isExpanded = expandedCards[cardId];

    const getStatusColor = value => {
      if (value > 0.4) return theme.palette.error.main;
      if (value > 0.3) return theme.palette.warning.main;
      return theme.palette.success.main;
    };

    const getStatusLabel = value => {
      if (value > 0.4) return 'Cao';
      if (value > 0.3) return 'Trung bình';
      return 'Tốt';
    };

    return (
      <Card
        sx={{
          mb: 1,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 1,
            borderColor: 'primary.main',
          },
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          {/* Primary Information - Always Visible */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              mb: 1,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Chip
                label={getStatusLabel(standard.standard)}
                size="small"
                sx={{
                  backgroundColor: alpha(getStatusColor(standard.standard), 0.1),
                  color: getStatusColor(standard.standard),
                  fontWeight: 500,
                  fontSize: '0.75rem',
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  handleOpenEditDialog(standard);
                }}
              />
              <DeleteButton
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteClick(standard.id);
                }}
              />
              <IconButton size="small" onClick={() => toggleCardExpand(cardId)} sx={{ ml: 1 }}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          {/* Secondary Information - Collapsed by default */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: isExpanded ? 1 : 0,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {standard.fromKm.toLocaleString()} - {standard.toKm.toLocaleString()} km
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
              {standard.standard.toFixed(2)} l/km
            </Typography>
          </Box>

          {/* Expandable Section - Detailed Information */}
          <Collapse in={isExpanded}>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Từ KM
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {standard.fromKm.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Đến KM
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {standard.toKm.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Định mức tiêu thụ
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: getStatusColor(standard.standard),
                      fontFamily: 'monospace',
                    }}
                  >
                    {standard.standard.toFixed(2)} lít/km
                  </Typography>
                </Grid>
                {standard.note && (
                  <Grid item xs={12}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      Ghi chú
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {standard.note}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
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
      showSnackbar('Sửa định mức dầu thành công');
      await fetchData();
      setOpenEditDialog(false);
    } catch (err) {
      showSnackbar('Đã xảy ra lỗi khi sửa định mức dầu', 'error');
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
        fullScreen={isMobile}
        sx={{
          '& .MuiPaper-root': {
            width: '100%',
            maxWidth: isMobile ? 'none' : '480px',
            borderRadius: isMobile ? 0 : '8px',
            boxShadow: isMobile ? 'none' : '0 4px 20px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            margin: isMobile ? 0 : '16px',
            height: isMobile ? '100vh' : 'auto',
          },
          '& .MuiBackdrop-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(2px)',
          },
        }}
        onKeyDown={e => e.key === 'Escape' && handleClose()}
        onClick={e => e.target === e.currentTarget && handleClose()}
      >
        <DialogContent
          sx={{
            p: isMobile ? '24px 16px 16px' : '32px 24px 24px',
            flex: isMobile ? 1 : 'none',
            overflowY: 'auto',
            position: 'relative',
          }}
        >
          {/* Close Button */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: isMobile ? 8 : 16,
              top: isMobile ? 8 : 16,
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            <CloseIcon fontSize={isMobile ? 'medium' : 'small'} />
          </IconButton>

          {/* License Plate Display */}
          <Box sx={{ mb: 3, pr: 5 }}>
            <Typography
              variant="h6"
              sx={{
                fontSize: isMobile ? '1.25rem' : '1.1rem',
                fontWeight: 600,
                color: 'primary.main',
                mb: 1,
              }}
            >
              {isEdit ? 'Sửa định mức dầu' : 'Thêm định mức dầu'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Biển số xe:
              </Typography>
              <Chip
                label={formData.licensePlate}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 500,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                }}
              />
            </Box>
          </Box>

          <DialogContentText
            sx={{
              mb: '20px',
              color: 'text.secondary',
              fontSize: isMobile ? '0.9rem' : '0.875rem',
              lineHeight: 1.5,
            }}
          >
            {isEdit
              ? 'Sửa thông tin định mức dầu cho phương tiện.'
              : 'Nhập thông tin định mức dầu mới cho phương tiện.'}
          </DialogContentText>

          <Box component="form" noValidate autoComplete="off" sx={{ '& > :not(style)': { mb: 2 } }}>
            <Grid container spacing={isMobile ? 3 : 2}>
              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: isMobile ? '0.9rem' : '0.8rem',
                  }}
                >
                  Phạm vi số km
                </Typography>
                <Grid container spacing={2} sx={{ mb: 1, display: 'flex', flexWrap: 'nowrap' }}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      size={isMobile ? 'medium' : 'small'}
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
                          height: isMobile ? '48px' : '40px',
                          padding: isMobile ? '12px 14px' : '8px 12px',
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
                      size={isMobile ? 'medium' : 'small'}
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
                          height: isMobile ? '48px' : '40px',
                          padding: isMobile ? '12px 14px' : '8px 12px',
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

              <Grid item xs={12}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: isMobile ? '0.9rem' : '0.8rem',
                  }}
                >
                  Định mức nhiên liệu
                </Typography>
                <TextField
                  fullWidth
                  size={isMobile ? 'medium' : 'small'}
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
                      height: isMobile ? '48px' : '40px',
                      padding: isMobile ? '12px 14px' : '8px 12px',
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
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    color: 'text.secondary',
                    fontWeight: 500,
                    fontSize: isMobile ? '0.9rem' : '0.8rem',
                  }}
                >
                  Ghi chú (tùy chọn)
                </Typography>
                <TextField
                  fullWidth
                  size={isMobile ? 'medium' : 'small'}
                  placeholder="Nhập ghi chú..."
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  variant="outlined"
                  margin="none"
                  multiline
                  rows={isMobile ? 3 : 4}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    style: {
                      padding: isMobile ? '14px' : '12px',
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
            p: isMobile ? '16px 24px 24px' : '16px 24px',
            bgcolor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            justifyContent: 'flex-end',
            gap: isMobile ? 2 : '12px',
            flexDirection: isMobile ? 'column' : 'row',
            '& > *': {
              margin: '0 !important',
            },
          }}
        >
          <Button
            onClick={handleClose}
            variant="outlined"
            color="inherit"
            size={isMobile ? 'large' : 'small'}
            fullWidth={isMobile}
            sx={{
              height: isMobile ? '48px' : '36px',
              px: isMobile ? '24px' : '16px',
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
            size={isMobile ? 'large' : 'small'}
            fullWidth={isMobile}
            disabled={isLoading}
            sx={{
              height: isMobile ? '48px' : '36px',
              px: isMobile ? '24px' : '20px',
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
            {isLoading ? 'Đang xử lý...' : isEdit ? 'Lưu' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 2 }}>
      <Box sx={{ mt: isMobile ? 1 : 2 }}>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1 : 2 }}>
            {allLicensePlatesWithStandards.map(({ licensePlate, standards }) => (
              <Paper
                key={licensePlate}
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: isMobile ? 2 : 1,
                  overflow: 'hidden',
                  boxShadow: isMobile ? 1 : 'none',
                }}
              >
                <Box
                  onClick={() => toggleExpand(licensePlate)}
                  sx={{
                    p: isMobile ? spacing(2) : spacing(1.5),
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
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        flexGrow: 1,
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'flex-start' : 'center',
                      }}
                    >
                      <Typography
                        variant={isMobile ? 'h6' : 'subtitle2'}
                        sx={{
                          fontWeight: 600,
                          fontSize: isMobile ? '1.1rem' : '0.875rem',
                        }}
                      >
                        {licensePlate}
                      </Typography>
                      {standards.length > 0 && (
                        <Box
                          sx={{
                            bgcolor: '#6B7280',
                            color: 'primary.contrastText',
                            borderRadius: '12px',
                            px: isMobile ? 1.5 : 1,
                            py: isMobile ? 0.5 : 0.25,
                            fontSize: isMobile ? '0.8rem' : '0.75rem',
                            fontWeight: 500,
                          }}
                        >
                          {standards.length}
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AddButton
                        size={isMobile ? 'medium' : 'small'}
                        onClick={e => {
                          e.stopPropagation();
                          handleOpenAddDialog(licensePlate);
                        }}
                        sx={{
                          minWidth: isMobile ? '36px' : '28px',
                          height: isMobile ? '36px' : 'auto',
                        }}
                      />
                      {expandedPlates[licensePlate] === true ? (
                        <ChevronUpIcon className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />
                      ) : (
                        <ChevronDownIcon className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />
                      )}
                    </Box>
                  </Box>
                </Box>

                <Collapse in={expandedPlates[licensePlate] === true} timeout="auto" unmountOnExit>
                  <Box sx={{ p: isMobile ? spacing(1) : spacing(1.5) }}>
                    {isMobile ? (
                      // Mobile Card Layout
                      standards.length === 0 ? (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: 'center', py: 3 }}
                        >
                          Chưa có dữ liệu định mức dầu
                        </Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {standards
                            .sort((a, b) => a.fromKm - b.fromKm)
                            .map(standard => (
                              <MobileFuelStandardCard
                                key={standard.id}
                                standard={standard}
                                licensePlate={licensePlate}
                              />
                            ))}
                        </Box>
                      )
                    ) : (
                      // Desktop Table Layout
                      <StandardTable
                        columns={[
                          {
                            key: 'fromKm',
                            label: 'TỪ (KM)',
                            numeric: true,
                            render: value => value.toLocaleString(),
                          },
                          {
                            key: 'toKm',
                            label: 'ĐẾN (KM)',
                            numeric: true,
                            render: value => value.toLocaleString(),
                          },
                          {
                            key: 'standard',
                            label: 'ĐỊNH MỨC (L/KM)',
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
                            label: 'GHI CHÚ',
                            render: value => value || '',
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
                    )}
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
