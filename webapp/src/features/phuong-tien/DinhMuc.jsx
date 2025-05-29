import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, AddButton } from '@/components/ActionButtons';
import * as dinhMucDauApi from '@services/mockApi/dinhMucDauApi';
import EditSupplementaryStandardDialog from './components/EditSupplementaryStandardDialog';
import DinhMucBoSung from './components/DinhMucBoSung';
import DinhMucTheoBienSoXeSection from './components/DinhMucTheoBienSoXeSection';
import DinhMucDiDuong from './components/DinhMucDiDuong';
import * as dauKeoApi from '@services/mockApi/dauKeoApi';
import * as roMoocApi from '@services/mockApi/roMoocApi';
import DinhMucDialog from './components/DinhMucDialog';
import { useDinhMucDauManagement } from '../../hooks/useDinhMucDauManagement';
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
    formData,
    setFormData, // Kept for form input
    errors, // Kept for form validation display
    currentStandard, // Kept for context in dialogs
    openAddDialog,
    setOpenAddDialog, // For controlling add dialog visibility
    openAddNewDinhMucDialog,
    handleFormInputChange,
    openEditDialog,
    setOpenEditDialog, // For controlling edit dialog visibility
    openEditDinhMucDialog,
    validateForm,
    handleSaveAdd,
    handleSaveEdit,
    deleteDialog, // For controlling delete dialog visibility
    openDeleteDialog,
    closeDeleteDialog,
    handleConfirmDelete,
    editSupplementaryDialog, // For supplementary dialog visibility
    closeEditSupplementaryDialog,
    handleSaveSupplementary,
  } = useDinhMucDauManagement();
  const [mobileTab, setMobileTab] = useState('supplementary');
  const [desktopTab, setDesktopTab] = useState('desktop_bo_sung'); // New state for desktop tabs
  // expandedCards state removed as it was for the old MobileFuelStandardCard
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
  // toggleCardExpand handler removed as it was for the old MobileFuelStandardCard
  return (
    <Box component="div" sx={{ p: isMobile ? 1 : 2, width: '100%' }}>
      <Box sx={{ mt: isMobile ? 1 : 2, width: '100%' }}>
        {isLoading ? (
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 0, md: 2 } }}>
            <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error.message || error.toString()}
          </Alert>
        ) : !isMobile ? (
          // Desktop View with Tabs
          <Box>
            <Tabs
              value={desktopTab}
              onChange={(event, newValue) => setDesktopTab(newValue)}
              aria-label="desktop fuel standard tabs"
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              <Tab label="Bổ Sung" value="desktop_bo_sung" />
              <Tab label="Chở hàng" value="desktop_dm_hang" />
              <Tab label="Vỏ rỗng" value="desktop_dm_vo" />
              <Tab label="Đi đường" value="desktop_di_duong" />
            </Tabs>

            {desktopTab === 'desktop_bo_sung' && (
              <DinhMucBoSung
                supplementaryStandard={supplementaryStandard}
                onSaveSupplementary={handleSaveSupplementary}
              />
            )}

            {(desktopTab === 'desktop_dm_hang' || desktopTab === 'desktop_dm_vo') && (
              <Box>
                <Box
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Tìm kiếm biển số xe..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <span role="img" aria-label="search">
                            🔍
                          </span>
                        </InputAdornment>
                      ),
                      sx: { borderRadius: '6px', height: 36, fontSize: '0.95rem' },
                    }}
                    sx={{
                      maxWidth: 400,
                      flexGrow: 1,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        height: 36,
                        fontSize: '0.95rem',
                      },
                      '& .MuiInputBase-input': { py: 0.5, fontSize: '0.95rem' },
                    }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() =>
                      openAddNewDinhMucDialog({
                        licensePlate: null,
                        loaiDinhMuc: desktopTab === 'desktop_dm_hang' ? 'km_hang' : 'km_vo',
                      })
                    }
                    sx={{ height: 36, ml: 2, whiteSpace: 'nowrap' }}
                  >
                    Thêm mới
                  </Button>
                </Box>
                <DinhMucTheoBienSoXeSection
                  dinhMucHang={dinhMucHang}
                  dinhMucVo={dinhMucVo}
                  activeLicensePlatesWithStandards={platesFromHook}
                  isLoading={isLoading}
                  error={error ? error.message || 'Lỗi không xác định' : null}
                  searchQuery={searchQuery} // Pass search query down if DinhMucTheoBienSoXeSection handles filtering
                  // onSearchQueryChange is handled above
                  onOpenAddNewDialog={openAddNewDinhMucDialog} // This might be redundant if Add button is above
                  onOpenEditDialog={openEditDinhMucDialog}
                  onOpenDeleteDialog={handleTriggerDeleteDialog}
                  // Consider passing a filter prop if 'Định mức hàng' and 'Định mức vỏ' should show different things
                  // e.g., normTypeFilter={desktopTab === 'desktop_dm_hang' ? 'km_hang' : 'km_vo'}
                />
              </Box>
            )}
            {desktopTab === 'desktop_di_duong' && <DinhMucDiDuong />}
          </Box>
        ) : (
          // Mobile View
          <Box> {/* Outer Box for mobile view */}
            <Tabs
              value={mobileTab}
              onChange={(event, newValue) => setMobileTab(newValue)}
              aria-label="mobile fuel standard tabs"
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
            >
              <Tab label="Bổ Sung" value="supplementary" />
              <Tab label="Chở hàng" value="mobile_dm_hang" />
              <Tab label="Vỏ rỗng" value="mobile_dm_vo" />
              <Tab label="Đi đường" value="mobile_di_duong" />
            </Tabs>

            {/* Tab Content Area with consistent padding */}
            {mobileTab === 'supplementary' && (
              <Box sx={{ pt: 2 }}>
                <DinhMucBoSung
                  supplementaryStandard={supplementaryStandard}
                  onSaveSupplementary={handleSaveSupplementary}
                />
              </Box>
            )}

            {(mobileTab === 'mobile_dm_hang' || mobileTab === 'mobile_dm_vo') && (
              <Box sx={{ pt: 2 }}>
                <Box
                  sx={{
                    mb: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <TextField
                    size="small"
                    variant="outlined"
                    placeholder="Tìm kiếm biển số xe..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <span role="img" aria-label="search">
                            🔍
                          </span>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ maxWidth: '300px', flexGrow: 1, mr: 1 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => openAddNewDinhMucDialog({ loaiDinhMuc: mobileTab === 'mobile_dm_hang' ? 'km_hang' : 'km_vo' })}
                    size="small"
                  >
                    Thêm mới
                  </Button>
                </Box>
                {platesFromHook
                  .filter(plate =>
                    plate.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(plate => (
                    <DinhMucTheoBienSoXeSection
                      key={`${plate.licensePlate}-${mobileTab}`}
                      licensePlate={plate.licensePlate}
                      standardsHang={mobileTab === 'mobile_dm_hang' ? (dinhMucHang[plate.licensePlate] || []) : []}
                      standardsVo={mobileTab === 'mobile_dm_vo' ? (dinhMucVo[plate.licensePlate] || []) : []}
                      displayType={mobileTab === 'mobile_dm_hang' ? 'km_hang' : 'km_vo'}
                      onEdit={(standard, loaiDinhMuc) =>
                        openEditDinhMucDialog({ standard, licensePlate: plate.licensePlate, loaiDinhMuc })
                      }
                      onDelete={(id, type, item) =>
                        handleTriggerDeleteDialog(id, type, item, plate.licensePlate)
                      }
                      onAdd={loaiDinhMuc =>
                        openAddNewDinhMucDialog({ licensePlate: plate.licensePlate, loaiDinhMuc })
                      }
                    />
                  ))}
              </Box>
            )}

            {mobileTab === 'mobile_di_duong' && (
              <Box sx={{ pt: 2 }}>
                <DinhMucDiDuong />
              </Box>
            )}
          </Box>
        )}
      </Box>
      {/* Render dialogs */}
      <DinhMucDialog
        open={openAddDialog}
        isEdit={false}
        isMobile={isMobile}
        formData={formData}
        errors={errors}
        onClose={() => setOpenAddDialog(false)}
        onSave={handleSaveAdd}
        onInputChange={handleFormInputChange}
        onValidateForm={validateForm}
      />
      <DinhMucDialog
        open={openEditDialog}
        isEdit={true}
        isMobile={isMobile}
        formData={formData}
        errors={errors}
        onClose={() => setOpenEditDialog(false)}
        onSave={handleSaveEdit}
        onInputChange={handleFormInputChange}
        onValidateForm={validateForm}
      />
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
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <ConfirmationDialog
        open={deleteDialog.open}
        onCancel={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc chắn muốn xóa ${deleteDialog.details}?`}
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default DinhMucDau;
