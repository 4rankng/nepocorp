import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import { dinhMucApi } from '@services/mockApi';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { ChevronDownIcon, ChevronUpIcon } from '@assets/icons';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

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
  const [dinhMucHang, setDinhMucHang] = useState({}); // Format: { '51C-12345': [...] }
  const [dinhMucVo, setDinhMucVo] = useState({}); // Format: { '51C-12345': [...] }
  const [licensePlates, setLicensePlates] = useState([]);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);
  const [supplementaryStandard, setSupplementaryStandard] = useState(0);
  const [editSupplementaryDialog, setEditSupplementaryDialog] = useState(false);
  const [newSupplementaryValue, setNewSupplementaryValue] = useState(0);
  const [mobileTab, setMobileTab] = useState('supplementary'); // 'supplementary', 'cargo', 'container'

  const [expandedCards, setExpandedCards] = useState({});
  const [formData, setFormData] = useState({
    bienSoXe: '',
    loaiDinhMuc: 'km_hang',
    tuKm: '',
    denKm: '',
    dinhMuc: '',
    ghiChu: '',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Create a combined array of all license plates with their standards
  const allLicensePlatesWithStandards = useMemo(() => {
    // Flatten all standards from all license plates
    const allStandards = Object.entries(dinhMucHang).flatMap(([licensePlate, standards]) =>
      standards.map(standard => ({ ...standard, licensePlate }))
    );

    // Create a map of license plates to their standards
    const standardsByLicensePlate = allStandards.reduce((acc, standard) => {
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
  }, [dinhMucHang, licensePlates]);

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
                  backgroundColor: theme => alpha(theme.palette.text.secondary, 0.1),
                  color: 'text.secondary',
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
                  handleEditClick(standard, licensePlate, mobileTab === 'cargo' ? 'km_hang' : 'km_vo');
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

  // Filter license plates by search query
  const filteredLicensePlatesWithStandards = useMemo(() => {
    if (!searchQuery.trim()) return allLicensePlatesWithStandards;
    return allLicensePlatesWithStandards.filter(({ licensePlate }) =>
      licensePlate.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
  }, [allLicensePlatesWithStandards, searchQuery]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all required data in parallel
      const [dauKeoResponse, roMoocResponse, supplementaryResponse] = await Promise.all([
        dauKeoApi.getAll(),
        roMoocApi.getAll(),
        dinhMucApi.getBoSung(),
      ]);

      // Combine dau keo and ro mooc into a single vehicles array
      const vehiclesResponse = [...dauKeoResponse, ...roMoocResponse];

      // Extract data from responses - mock API returns data directly
      const vehicles = Array.isArray(vehiclesResponse) ? vehiclesResponse : [];
      const supplementary = supplementaryResponse || { value: 0 };

      // Extract license plates from vehicles
      const plates = vehicles.map(vehicle => ({
        id: vehicle.id,
        licensePlate: vehicle.bien_so, // Using bien_so from dauKeo.js
      }));

      // Fetch fuel standards for each license plate
      const plateStandards = {};
      const plateVoStandards = {};

      for (const plate of plates) {
        if (!plate.licensePlate) continue; // Skip if no license plate

        const [hangRes, voRes] = await Promise.all([
          dinhMucApi.getByBienSoAndType(plate.licensePlate, 'km_hang'),
          dinhMucApi.getByBienSoAndType(plate.licensePlate, 'km_vo'),
        ]);

        // Map API fields to frontend fields for hang
        plateStandards[plate.licensePlate] = (hangRes.data || []).map(item => ({
          id: item.id,
          fromKm: item.tuKm,
          toKm: item.denKm,
          standard: item.l_km,
          note: item.ghiChu,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
        // Map API fields to frontend fields for vo
        plateVoStandards[plate.licensePlate] = (voRes.data || []).map(item => ({
          id: item.id,
          fromKm: item.tuKm,
          toKm: item.denKm,
          standard: item.l_km,
          note: item.ghiChu,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
      }

      // Update state with fetched data
      setDinhMucHang(plateStandards);
      setDinhMucVo(plateVoStandards);
      setLicensePlates(plates);
      setSupplementaryStandard(supplementary.value);
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

  const handleOpenAddDialog = (licensePlate, type) => {
    let loaiDinhMuc = type;
    // On mobile, set loaiDinhMuc based on mobileTab if not provided
    if (isMobile && !loaiDinhMuc) {
      loaiDinhMuc = mobileTab === 'cargo' ? 'km_hang' : 'km_vo';
    }
    setFormData({
      bienSoXe: licensePlate,
      loaiDinhMuc: loaiDinhMuc || 'km_hang',
      tuKm: '',
      denKm: '',
      dinhMuc: '',
      ghiChu: '',
    });
    setErrors({});
    setOpenAddDialog(true);
  };

  const handleEditClick = (standard, licensePlate, type) => {
    setFormData({
      id: standard.id,
      bienSoXe: licensePlate,
      loaiDinhMuc: type || 'km_hang',
      tuKm: standard.fromKm || '',
      denKm: standard.toKm || '',
      dinhMuc: standard.standard || '',
      ghiChu: standard.note || '',
    });
    setEditingId(standard.id);
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

  const handleUpdateSupplementary = async () => {
    try {
      setIsLoading(true);
      // Call API to update the supplementary standard
      const response = await dinhMucApi.updateBoSung(parseFloat(newSupplementaryValue));

      if (response) {
        // Update local state with the response data - mock API returns the updated value directly
        setSupplementaryStandard(response.value || parseFloat(newSupplementaryValue));
        setEditSupplementaryDialog(false);
        showSnackbar('Cập nhật định mức bổ sung thành công', 'success');
      }
    } catch (error) {
      console.error('Error updating supplementary standard:', error);
      showSnackbar('Có lỗi xảy ra khi cập nhật định mức bổ sung', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.bienSoXe) newErrors.bienSoXe = 'Vui lòng chọn biển số xe';
    if (!formData.tuKm) newErrors.tuKm = 'Vui lòng nhập km bắt đầu';
    if (!formData.denKm) newErrors.denKm = 'Vui lòng nhập km kết thúc';
    if (parseFloat(formData.tuKm) >= parseFloat(formData.denKm)) {
      newErrors.denKm = 'Km kết thúc phải lớn hơn km bắt đầu';
    }
    if (!formData.dinhMuc) newErrors.dinhMuc = 'Vui lòng nhập định mức';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveAdd = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Check for overlapping ranges
      const from = parseFloat(formData.tuKm);
      const to = parseFloat(formData.denKm);
      const currentStandards = formData.loaiDinhMuc === 'km_hang'
        ? dinhMucHang[formData.bienSoXe] || []
        : dinhMucVo[formData.bienSoXe] || [];

      const overlapping = currentStandards.some(item => {
        return (
          (from >= item.fromKm && from < item.toKm) ||
          (to > item.fromKm && to <= item.toKm) ||
          (from <= item.fromKm && to >= item.toKm)
        );
      });

      if (overlapping) {
        setErrors(prev => ({
          ...prev,
          denKm: 'Khoảng km này đã được định nghĩa cho biển số xe này',
        }));
        return;
      }

      // Map form data to API format
      const apiData = {
        bienSoXe: formData.bienSoXe,
        loaiDinhMuc: formData.loaiDinhMuc,
        tuKm: formData.tuKm,
        denKm: formData.denKm,
        dinhMuc: formData.dinhMuc,
        ghiChu: formData.ghiChu,
      };

      await dinhMucApi.create(apiData);
      showSnackbar(`Thêm định mức ${formData.loaiDinhMuc === 'km_hang' ? 'hàng' : 'vỏ'} thành công`);
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
      const from = parseFloat(formData.tuKm);
      const to = parseFloat(formData.denKm);
      const currentStandards = formData.loaiDinhMuc === 'km_hang'
        ? dinhMucHang[formData.bienSoXe] || []
        : dinhMucVo[formData.bienSoXe] || [];

      const overlapping = currentStandards.some(item => {
        if (item.id === formData.id) return false; // Skip current item
        return (
          (from >= item.fromKm && from < item.toKm) ||
          (to > item.fromKm && to <= item.toKm) ||
          (from <= item.fromKm && to >= item.toKm)
        );
      });

      if (overlapping) {
        setErrors(prev => ({
          ...prev,
          denKm: 'Khoảng km này đã được định nghĩa cho biển số xe này',
        }));
        return;
      }

      // Map form data to API format
      const apiData = {
        id: formData.id,
        bienSoXe: formData.bienSoXe,
        loaiDinhMuc: formData.loaiDinhMuc,
        tuKm: formData.tuKm,
        denKm: formData.denKm,
        dinhMuc: formData.dinhMuc,
        ghiChu: formData.ghiChu,
      };

      await dinhMucApi.update(formData.id, apiData);
      showSnackbar(`Sửa định mức ${formData.loaiDinhMuc === 'km_hang' ? 'hàng' : 'vỏ'} thành công`);
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
    // Find the item to delete from all standards (both hàng and vỏ)
    const allStandards = [
      ...Object.entries(dinhMucHang).flatMap(([licensePlate, standards]) =>
        standards.map(standard => ({ ...standard, licensePlate, type: 'km_hang' }))
      ),
      ...Object.entries(dinhMucVo).flatMap(([licensePlate, standards]) =>
        standards.map(standard => ({ ...standard, licensePlate, type: 'km_vo' }))
      )
    ];

    const itemToDelete = allStandards.find(item => item.id === id);
    if (!itemToDelete) return;

    setDeleteDialog({
      open: true,
      id,
      details: {
        'Biển số xe': itemToDelete.licensePlate,
        'Loại định mức': itemToDelete.type === 'km_hang' ? 'Định mức hàng' : 'Định mức vỏ',
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
      await dinhMucApi.delete(deleteDialog.id);
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
              {isEdit
                ? `Sửa Định Mức ${formData.loaiDinhMuc === 'km_hang' ? 'Hàng' : 'Vỏ'}`
                : isMobile
                  ? `Thêm Định Mức ${formData.loaiDinhMuc === 'km_hang' ? 'Hàng' : 'Vỏ'}`
                  : 'Thêm Định Mức'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Biển số xe:
              </Typography>
              <Chip
                label={formData.bienSoXe}
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

          <Box component="form" noValidate autoComplete="off" sx={{ '& > :not(style)': { mb: 2 } }}>
            <Grid container spacing={isMobile ? 3 : 2}>
              {/* Hide Loại định mức selection on mobile for add modal */}
              {!isEdit && !isMobile && (
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
                    Loại định mức
                  </Typography>
                  <Box component="div" sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                    <Box
                      component="div"
                      onClick={() => handleInputChange({ target: { name: 'loaiDinhMuc', value: 'km_hang' } })}
                      sx={{
                        flex: 1,
                        py: 1,
                        px: 2.5,
                        height: '40px',
                        minWidth: '160px',
                        border: formData.loaiDinhMuc === 'km_hang' ? '2px solid' : '1px solid',
                        borderColor: formData.loaiDinhMuc === 'km_hang' ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="body2" align="center" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Định Mức Hàng
                      </Typography>
                    </Box>
                    <Box
                      component="div"
                      onClick={() => handleInputChange({ target: { name: 'loaiDinhMuc', value: 'km_vo' } })}
                      sx={{
                        flex: 1,
                        py: 1,
                        px: 2.5,
                        height: '40px',
                        minWidth: '160px',
                        border: formData.loaiDinhMuc === 'km_vo' ? '2px solid' : '1px solid',
                        borderColor: formData.loaiDinhMuc === 'km_vo' ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="body2" align="center" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                        Định Mức Vỏ
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
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
    <Box component="div" sx={{ p: isMobile ? 1 : 2, width: '100%' }}>
      {/* 1. Add Tabs for mobile at the top, and supplementary standard at the top for desktop */}
      <Box component="div" sx={{ mb: isMobile ? 1 : 2 }}>
        {isMobile ? (
          <Tabs
            value={mobileTab}
            onChange={(e, v) => setMobileTab(v)}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
            sx={{ mb: 1 }}
          >
            <Tab label="Bổ sung" value="supplementary" />
            <Tab label="Định mức hàng" value="cargo" />
            <Tab label="Định mức vỏ" value="container" />
          </Tabs>
        ) : (
          <Paper
            elevation={0}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              p: 1.5,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              gap: 2
            }}
          >
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ lineHeight: 1.2, mb: 0.5 }}>
                Định mức bổ sung
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>
                {supplementaryStandard} lít/chuyến
              </Typography>
            </Box>
            <EditButton
              onClick={() => {
                setNewSupplementaryValue(supplementaryStandard);
                setEditSupplementaryDialog(true);
              }}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
          </Paper>
        )}
      </Box>

      {/* 2. Search Bar (conditional for mobile, always for desktop) */}
      {(isMobile && (mobileTab === 'cargo' || mobileTab === 'container')) || (!isMobile) && (
        <Box sx={{ mb: isMobile ? 1 : 2, maxWidth: 360 }}>
          <TextField
            fullWidth
            size="small"
            variant="outlined"
            placeholder="Tìm kiếm biển số xe..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <span role="img" aria-label="search">🔍</span>
                </InputAdornment>
              ),
              sx: {
                borderRadius: '6px',
                height: isMobile ? 36 : 36, // reduce height for both
                minHeight: isMobile ? 36 : 36,
                fontSize: '0.95rem',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '6px',
                height: isMobile ? 36 : 36,
                minHeight: isMobile ? 36 : 36,
                fontSize: '0.95rem',
              },
              '& .MuiInputBase-input': {
                py: 0.5,
                fontSize: '0.95rem',
              },
            }}
          />
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ mt: isMobile ? 1 : 2, width: '100%' }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {error}
          </Alert>
        ) : filteredLicensePlatesWithStandards.length === 0 ? (
          <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
            {searchQuery.trim()
              ? 'Không tìm thấy biển số xe phù hợp.'
              : 'Chưa có dữ liệu biển số xe. Vui lòng thêm biển số xe trước.'}
          </Alert>
        ) : (
          <>
            {/* MOBILE: Tab content switch */}
            {isMobile ? (
              mobileTab === 'supplementary' ? (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      p: 1.5,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      gap: 2
                    }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', fontFamily: 'monospace' }}>
                        {supplementaryStandard} lít/chuyến
                      </Typography>
                    </Box>
                    <EditButton
                      onClick={() => {
                        setNewSupplementaryValue(supplementaryStandard);
                        setEditSupplementaryDialog(true);
                      }}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                  </Paper>
                </Box>
              ) : (
                // Định mức hàng/vo cards with search
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Search Bar */}
                  <Box sx={{ mb: 1, px: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      variant="outlined"
                      placeholder={`Tìm kiếm biển số xe...`}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <span role="img" aria-label="search">🔍</span>
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
                  </Box>

                  {filteredLicensePlatesWithStandards.map(({ licensePlate }) => {
                    const standards = mobileTab === 'cargo' ? (dinhMucHang[licensePlate] || []) : (dinhMucVo[licensePlate] || []);
                    return (
                      <Paper
                        key={licensePlate}
                        elevation={1}
                        sx={{ borderRadius: 2, p: 1.5, mb: 1, width: '100%' }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {licensePlate}
                          </Typography>
                          <AddButton
                            size="small"
                            onClick={() => handleOpenAddDialog(licensePlate)}
                            sx={{ minWidth: 32, height: 32 }}
                          />
                        </Box>

                        {standards.length === 0 ? (
                          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                            Chưa có dữ liệu định mức
                          </Typography>
                        ) : (
                          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, width: '100%' }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                                  <TableCell sx={{ fontWeight: 600, py: 1, pl: 2, pr: 1 }}>TỪ (KM)</TableCell>
                                  <TableCell sx={{ fontWeight: 600, py: 1, px: 1 }}>ĐẾN (KM)</TableCell>
                                  <TableCell sx={{ fontWeight: 600, py: 1, px: 1 }}>ĐỊNH MỨC (L/KM)</TableCell>
                                  <TableCell sx={{ width: 80, py: 1, pr: 1 }}></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {standards.sort((a, b) => a.fromKm - b.fromKm).map((standard) => (
                                  <TableRow
                                    key={standard.id}
                                    hover
                                    sx={{
                                      '&:last-child td, &:last-child th': { border: 0 },
                                      '&:hover': { backgroundColor: 'action.hover' }
                                    }}
                                  >
                                    <TableCell sx={{ py: 1, pl: 2, pr: 1 }}>{standard.fromKm}</TableCell>
                                    <TableCell sx={{ py: 1, px: 1 }}>{standard.toKm}</TableCell>
                                    <TableCell sx={{ py: 1, px: 1 }}>{standard.standard}</TableCell>
                                    <TableCell sx={{ py: 1, pr: 1, textAlign: 'right' }}>
                                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                                        <EditButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditClick(standard, licensePlate, mobileTab === 'cargo' ? 'km_hang' : 'km_vo');
                                          }}
                                        />
                                        <DeleteButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteClick(standard.id);
                                          }}
                                        />
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Paper>
                    );
                  })}
                </Box>
              )
            ) : (
              // DESKTOP: For each vehicle, show two tables: hàng and vỏ
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filteredLicensePlatesWithStandards.map(({ licensePlate }) => (
                  <Box key={licensePlate} sx={{ mb: 3, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
                        {licensePlate}
                      </Typography>
                      <AddButton
                        size="small"
                        onClick={() => handleOpenAddDialog(licensePlate)}
                        sx={{ minWidth: 32, height: 32 }}
                        title="Thêm định mức mới"
                      />
                    </Box>
                    <Grid container spacing={2} sx={{ width: '100%' }}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Định mức hàng
                        </Typography>
                        <StandardTable
                          columns={[
                            { key: 'fromKm', label: 'TỪ (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
                            { key: 'toKm', label: 'ĐẾN (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
                            { key: 'standard', label: 'ĐỊNH MỨC (L/KM)', numeric: true, render: value => value !== undefined && value !== null ? Number(value).toFixed(2) : '-' },
                            { key: 'note', label: 'MÔ TẢ', render: value => value || '' },
                          ]}
                          data={(dinhMucHang[licensePlate] || []).sort((a, b) => a.fromKm - b.fromKm)}
                          renderActions={row => (
                            <>
                              <EditButton onClick={e => { e.stopPropagation(); handleEditClick(row, licensePlate, 'km_hang'); }} />
                              <DeleteButton onClick={e => { e.stopPropagation(); handleDeleteClick(row.id); }} />
                            </>
                          )}
                          emptyMessage="Chưa có dữ liệu định mức hàng"
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Định mức vỏ
                        </Typography>
                        <StandardTable
                          columns={[
                            { key: 'fromKm', label: 'TỪ (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
                            { key: 'toKm', label: 'ĐẾN (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
                            { key: 'standard', label: 'ĐỊNH MỨC (L/KM)', numeric: true, render: value => value !== undefined && value !== null ? Number(value).toFixed(2) : '-' },
                            { key: 'note', label: 'MÔ TẢ', render: value => value || '' },
                          ]}
                          data={(dinhMucVo[licensePlate] || []).sort((a, b) => a.fromKm - b.fromKm)}
                          renderActions={row => (
                            <>
                              <EditButton onClick={e => { e.stopPropagation(); handleEditClick(row, licensePlate, 'km_vo'); }} />
                              <DeleteButton onClick={e => { e.stopPropagation(); handleDeleteClick(row.id); }} />
                            </>
                          )}
                          emptyMessage="Chưa có dữ liệu định mức vỏ"
                          sx={{ width: '100%' }}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Render dialogs */}
      {renderDialog()}
      {renderDialog(true)}

      {/* Supplementary Standard Dialog */}
      <Dialog
        open={editSupplementaryDialog}
        onClose={() => setEditSupplementaryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cập nhật định mức bổ sung</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Định mức bổ sung (L/chuyến)"
            type="number"
            fullWidth
            variant="outlined"
            value={newSupplementaryValue}
            onChange={e => setNewSupplementaryValue(parseFloat(e.target.value) || 0)}
            inputProps={{
              step: 0.1,
              min: 0,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditSupplementaryDialog(false)}>Hủy</Button>
          <Button
            onClick={handleUpdateSupplementary}
            variant="contained"
            color="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

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
