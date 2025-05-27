import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import { dinhMucApi } from '@services/mockApi';
import EditSupplementaryStandardDialog from './components/EditSupplementaryStandardDialog';
import LicensePlateNormsCard from './components/LicensePlateNormsCard';
import { dauKeoApi, roMoocApi } from '@services/mockApi';
import DinhMucDialog from './components/DinhMucDialog';
import { useDinhMucManagement } from '../../hooks/useDinhMucManagement';

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

  const {
    dinhMucHang,
    dinhMucVo,
    supplementaryStandard,
    activeLicensePlatesWithStandards: platesFromHook,
    allAvailableLicensePlates,
    isLoading,
    error,
    snackbar,
    closeSnackbar,
    fetchData,
    formData, setFormData, // Kept for form input
    errors, // Kept for form validation display
    currentStandard, // Kept for context in dialogs
    openAddDialog, setOpenAddDialog, // For controlling add dialog visibility
    openAddNewDinhMucDialog,
    handleFormInputChange,
    openEditDialog, setOpenEditDialog, // For controlling edit dialog visibility
    openEditDinhMucDialog,
    validateForm,
    handleSaveAdd,
    handleSaveEdit,
    deleteDialog, // For controlling delete dialog visibility
    openDeleteDialog,
    closeDeleteDialog,
    handleConfirmDelete,
    editSupplementaryDialog, // For supplementary dialog visibility
    openEditSupplementaryDialog,
    closeEditSupplementaryDialog,
    handleSaveSupplementary,
  } = useDinhMucManagement();
  const [mobileTab, setMobileTab] = useState('supplementary');

  const [expandedCards, setExpandedCards] = useState({});

  const [orderBy, setOrderBy] = useState('fromKm');
  const [order, setOrder] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTriggerDeleteDialog = (id, type, item, licensePlate) => {
    let detailsText = '';
    const plateIdText = licensePlate ? `cho BSX ${licensePlate}` : '';

    if (type === 'km_hang') {
      detailsText = `định mức hàng (Từ ${item.fromKm}km đến ${item.toKm}km) ${plateIdText}`;
    } else if (type === 'km_vo') {
      detailsText = `định mức vỏ (Từ ${item.fromKm}km đến ${item.toKm}km) ${plateIdText}`;
    } else if (type === 'bo_sung') {
      detailsText = `định mức bổ sung ${item.standardValue} ${item.standardUnit} cho ${item.vehicleType} ${plateIdText}`;
    } else {
      detailsText = 'định mức đã chọn'; // Fallback
    }
    openDeleteDialog(id, type, detailsText);
  };

  const [expandedPlates, setExpandedPlates] = useState({});

  const filteredLicensePlatesWithStandards = useMemo(() => {
    if (!searchQuery) {
      return platesFromHook;
    }
    return platesFromHook.filter(item =>
      item.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [platesFromHook, searchQuery]);

  const toggleExpand = licensePlate => {
    setExpandedPlates(prev => ({
      ...prev,
      [licensePlate]: !prev[licensePlate],
    }));
  };

  const toggleCardExpand = cardId => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

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
                onClick={() => {
                  const type = standard.loaiDinhMuc;
                  const details = `${type === 'km_hang' ? 'hàng' : 'vỏ'} từ ${standard.fromKm}km đến ${standard.toKm}km`;
                  openDeleteDialog(standard.id, type, details);
                }}
              />
              <IconButton size="small" onClick={() => toggleCardExpand(cardId)} sx={{ ml: 1 }}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

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

  const handleEditClick = (standard, licensePlate, type) => {
    openEditDinhMucDialog({ standard, licensePlate, loaiDinhMuc: type });
  };

  const handleUpdateSupplementary = async () => {
    try {
      setIsLoading(true);
      const response = await dinhMucApi.updateBoSung(parseFloat(newSupplementaryValue));

      if (response) {
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

  return (
    <Box component="div" sx={{ p: isMobile ? 1 : 2, width: '100%' }}>
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
              onClick={openEditSupplementaryDialog}
              size="small"
              sx={{ alignSelf: 'flex-start' }}
            />
          </Paper>
        )}
      </Box>

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
                height: isMobile ? 36 : 36,
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
                      onClick={openEditSupplementaryDialog}
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

                  {filteredLicensePlatesWithStandards.map(({ licensePlate }) => (
                    <LicensePlateNormsCard
                      key={licensePlate}
                      licensePlate={licensePlate}
                      hangNorms={dinhMucHang[licensePlate] || []}
                      voNorms={dinhMucVo[licensePlate] || []}
                      isMobile={isMobile}
                      mobileTab={mobileTab}
                      onOpenAddDialog={() => openAddNewDinhMucDialog({ licensePlate: null, loaiDinhMuc: mobileTab === 'cargo' ? 'km_hang' : 'km_vo' })}
                      onEditClick={(item, lp, type) => openEditDinhMucDialog({ standard: item, licensePlate: lp, loaiDinhMuc: type })}
                      onDeleteClick={(id, type, item) => handleTriggerDeleteDialog(id, type, item, plate.licensePlate)}
                    />
                  ))}
                </Box>
              )
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {filteredLicensePlatesWithStandards.map(({ licensePlate }) => (
                  <LicensePlateNormsCard
                    key={licensePlate}
                    licensePlate={licensePlate}
                    hangNorms={dinhMucHang[licensePlate] || []}
                    voNorms={dinhMucVo[licensePlate] || []}
                    isMobile={isMobile} // Will be false here
                    // mobileTab is not relevant for desktop view
                    onOpenAddDialog={() => openAddNewDinhMucDialog({ licensePlate: licensePlate, loaiDinhMuc: 'km_hang' })} // Pass current licensePlate
                    onEditClick={(item, lp, type) => openEditDinhMucDialog({ standard: item, licensePlate: lp, loaiDinhMuc: type })}
                    onDeleteClick={(id, type, item) => handleTriggerDeleteDialog(id, type, item, licensePlate)}
                  />
                ))}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Render dialogs */}
      <DinhMucDialog open={openAddDialog} isEdit={false} isMobile={isMobile} formData={formData} errors={errors} onClose={() => setOpenAddDialog(false)} onSave={handleSaveAdd} onInputChange={handleFormInputChange} onValidateForm={validateForm} />
      <DinhMucDialog open={openEditDialog} isEdit={true} isMobile={isMobile} formData={formData} errors={errors} onClose={() => setOpenEditDialog(false)} onSave={handleSaveEdit} onInputChange={handleFormInputChange} onValidateForm={validateForm} />

      {/* Supplementary Standard Dialog */}
      <EditSupplementaryStandardDialog
        open={editSupplementaryDialog} // From hook
        onClose={closeEditSupplementaryDialog} // From hook
        initialValue={supplementaryStandard} // From hook (already was)
        onSave={handleSaveSupplementary} // From hook
        isLoading={isLoading} // From hook (already was)
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{
          vertical: isMobile ? 'bottom' : 'top',
          horizontal: isMobile ? 'center' : 'right',
        }}
        sx={isMobile ? { bottom: 90 } : {}}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <ConfirmationDialog
        open={deleteDialog.open} // From hook
        onCancel={closeDeleteDialog} // Pass closeDeleteDialog to onCancel prop
        onConfirm={handleConfirmDelete} // From hook
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${deleteDialog.details}?`} // deleteDialog.details from hook
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default DinhMucDau;
