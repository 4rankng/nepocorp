import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ConfirmationDialog from '@shared/components/ConfirmationDialog';

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardHeader,
  CardContent,
  Collapse,
  Typography,
} from '@mui/material';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '../../../assets/icons';
import { visuallyHidden } from '@mui/utils';
import AddButton from '@shared/components/AddButton';

// Mock API for demonstration
const mockApi = {
  getFuelStandards: async () => [
    { id: 1, licensePlate: '51G-12345', fromKm: 0, toKm: 10000, standard: 0.35, note: 'Mới' },
    {
      id: 2,
      licensePlate: '51G-12345',
      fromKm: 10000,
      toKm: 30000,
      standard: 0.32,
      note: 'Chạy rà',
    },
    {
      id: 3,
      licensePlate: '51G-12345',
      fromKm: 30000,
      toKm: 100000,
      standard: 0.3,
      note: 'Ổn định',
    },
    { id: 4, licensePlate: '51G-67890', fromKm: 0, toKm: 5000, standard: 0.38, note: 'Mới' },
    {
      id: 5,
      licensePlate: '51G-67890',
      fromKm: 5000,
      toKm: 20000,
      standard: 0.35,
      note: 'Chạy rà',
    },
  ],
  getLicensePlates: async () => [
    { id: 1, licensePlate: '51G-12345' },
    { id: 2, licensePlate: '51G-67890' },
    { id: 3, licensePlate: '51G-54321' },
  ],
  addFuelStandard: async data => ({
    id: Date.now(),
    ...data,
    fromKm: Number(data.fromKm),
    toKm: Number(data.toKm),
    standard: Number(data.standard),
  }),
  updateFuelStandard: async (id, data) => ({
    id,
    ...data,
    fromKm: Number(data.fromKm),
    toKm: Number(data.toKm),
    standard: Number(data.standard),
  }),
  deleteFuelStandard: async id => id,
};

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
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedPlates, setExpandedPlates] = useState({});
  const [formData, setFormData] = useState({
    licensePlate: '',
    fromKm: '',
    toKm: '',
    standard: '',
    note: '',
  });
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
      const [standards, plates] = await Promise.all([
        mockApi.getFuelStandards(),
        mockApi.getLicensePlates(),
      ]);
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

  const handleOpenAddDialog = (licensePlate = '') => {
    if (!licensePlate) return; // Prevent opening dialog without a license plate

    setEditingId(null);
    setFormData({
      licensePlate,
      fromKm: '',
      toKm: '',
      standard: '',
      note: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = item => {
    setEditingId(item.id);
    setFormData({
      licensePlate: item.licensePlate,
      fromKm: item.fromKm,
      toKm: item.toKm,
      standard: item.standard,
      note: item.note || '',
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.licensePlate) {
      setError('Vui lòng chọn biển số xe');
      return false;
    }
    if (!formData.fromKm || isNaN(formData.fromKm) || formData.fromKm < 0) {
      setError('Giá trị "Từ km" phải là số dương');
      return false;
    }
    if (!formData.toKm || isNaN(formData.toKm) || formData.toKm <= 0) {
      setError('Giá trị "Đến km" phải là số dương');
      return false;
    }
    if (Number(formData.fromKm) >= Number(formData.toKm)) {
      setError('Giá trị "Đến km" phải lớn hơn "Từ km"');
      return false;
    }
    if (!formData.standard || isNaN(formData.standard) || formData.standard <= 0) {
      setError('Định mức (l/km) phải là số dương');
      return false;
    }

    // Check for overlapping ranges
    const from = Number(formData.fromKm);
    const to = Number(formData.toKm);
    const overlapping = fuelStandards.some(item => {
      if (editingId && item.id === editingId) return false;
      if (item.licensePlate !== formData.licensePlate) return false;
      return (
        (from >= item.fromKm && from < item.toKm) ||
        (to > item.fromKm && to <= item.toKm) ||
        (from <= item.fromKm && to >= item.toKm)
      );
    });

    if (overlapping) {
      setError('Khoảng km này đã được định nghĩa cho biển số xe này');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const data = { ...formData };

      if (editingId) {
        await mockApi.updateFuelStandard(editingId, data);
        showSnackbar('Cập nhật định mức dầu thành công');
      } else {
        await mockApi.addFuelStandard(data);
        showSnackbar('Thêm định mức dầu thành công');
      }
      await fetchData();
      handleCloseDialog();
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu định mức dầu');
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
      await mockApi.deleteFuelStandard(deleteDialog.id);
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

  const getRouteTypeLabel = type => {
    const found = routeTypes.find(rt => rt.value === type);
    return found ? found.label : type;
  };

  // Sort standards by fromKm
  const sortStandards = standards => {
    return [...standards].sort((a, b) => {
      if (order === 'asc') {
        return a[orderBy] - b[orderBy];
      } else {
        return b[orderBy] - a[orderBy];
      }
    });
  };

  const handleSort = property => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const createSortHandler = property => event => {
    handleSort(property);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Quản Lý Định Mức Dầu
        </Typography>
      </Box>

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
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': { backgroundColor: 'action.hover' },
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
                  <Box sx={{ p: 1.5, pt: 1.5 }}>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small" sx={{ minWidth: 600 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell
                              sx={{ fontWeight: 600, py: 1, pl: 2, pr: 1, fontSize: '0.8125rem' }}
                            >
                              Từ (km)
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 600, py: 1, px: 1, fontSize: '0.8125rem' }}
                            >
                              Đến (km)
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 600, py: 1, px: 1, fontSize: '0.8125rem' }}
                            >
                              Định mức (l/km)
                            </TableCell>
                            <TableCell
                              sx={{ fontWeight: 600, py: 1, px: 1, fontSize: '0.8125rem' }}
                            >
                              Ghi chú
                            </TableCell>
                            <TableCell 
                              align="right" 
                              sx={{ fontWeight: 600, py: 1, px: 1, fontSize: '0.8125rem', width: '120px' }}
                            >
                              Thao tác
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {standards.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                                Chưa có dữ liệu định mức dầu
                              </TableCell>
                            </TableRow>
                          ) : (
                            standards
                              .sort((a, b) => a.fromKm - b.fromKm)
                              .map(row => (
                                <TableRow
                                  key={row.id}
                                  hover
                                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                  <TableCell sx={{ py: 0.75, pl: 2, pr: 1, fontSize: '0.8125rem' }}>
                                    {row.fromKm.toLocaleString()}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.75, px: 1, fontSize: '0.8125rem' }}>
                                    {row.toKm.toLocaleString()}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.75, px: 1, fontSize: '0.8125rem' }}>
                                    {row.standard}
                                  </TableCell>
                                  <TableCell sx={{ py: 0.75, px: 1, fontSize: '0.8125rem' }}>
                                    {row.note || '-'}
                                  </TableCell>
                                  <TableCell align="right" sx={{ py: 0.75, pl: 1, pr: 2 }}>
                                    <Box
                                      sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}
                                    >
                                      <IconButton
                                        size="small"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleOpenEditDialog(row);
                                        }}
                                        color="primary"
                                      >
                                        <PencilIcon className="w-5 h-5" />
                                      </IconButton>
                                      <IconButton
                                        size="small"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDeleteClick(row.id);
                                        }}
                                        color="error"
                                      >
                                        <TrashIcon className="w-5 h-5" />
                                      </IconButton>
                                    </Box>
                                  </TableCell>
                                </TableRow>
                              ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </Collapse>
              </Paper>
            ))}
          </Box>
        )}
      </Box>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        onKeyDown={e => e.key === 'Escape' && handleCloseDialog()}
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            paddingTop: '64px',
          },
          '& .MuiPaper-root': {
            margin: '16px',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
          '& .MuiDialogTitle-root': {
            padding: '16px 24px',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            borderBottom: '1px solid #E5E7EB',
          },
          '& .MuiDialogContent-root': {
            padding: '24px',
            '&:first-of-type': {
              paddingTop: '24px',
            },
          },
          '& .MuiDialogActions-root': {
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            justifyContent: 'flex-end',
            gap: '8px',
          },
        }}
      >
        <DialogTitle>{editingId ? 'Chỉnh Sửa Định Mức Dầu' : 'Thêm Định Mức Dầu Mới'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
            <TextField
              size="small"
              id="licensePlate"
              name="licensePlate"
              label="Biển Số Xe"
              value={formData.licensePlate}
              disabled={true}
              margin="none"
              InputLabelProps={{
                shrink: true,
              }}
            />

            <Box sx={{ display: 'flex', gap: 1.5, '& .MuiTextField-root': { flex: 1 } }}>
              <TextField
                size="small"
                label="Từ (km)"
                name="fromKm"
                type="number"
                value={formData.fromKm}
                onChange={handleInputChange}
                disabled={isLoading}
                margin="none"
                inputProps={{ min: 0, step: 1, style: { textAlign: 'right' } }}
              />
              <TextField
                size="small"
                label="Đến (km)"
                name="toKm"
                type="number"
                value={formData.toKm}
                onChange={handleInputChange}
                disabled={isLoading}
                margin="none"
                inputProps={{ min: 1, step: 1, style: { textAlign: 'right' } }}
              />
            </Box>

            <TextField
              size="small"
              id="standard"
              name="standard"
              label="Định mức (l/km)"
              type="number"
              value={formData.standard}
              onChange={handleInputChange}
              disabled={isLoading}
              margin="none"
              inputProps={{
                min: 0.001,
                step: 0.001,
                style: { textAlign: 'right' },
              }}
            />

            <TextField
              size="small"
              id="note"
              name="note"
              label="Ghi chú"
              value={formData.note}
              onChange={handleInputChange}
              disabled={isLoading}
              margin="none"
              multiline
              rows={2}
              inputProps={{
                style: { fontSize: '0.875rem' },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseDialog}
            variant="outlined"
            disabled={isLoading}
            sx={{
              height: 36,
              px: 2,
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#4B5563',
              borderColor: '#D1D5DB',
              backgroundColor: 'white',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderColor: '#9CA3AF',
              },
              '&:active': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isLoading}
            sx={{
              height: 36,
              px: 3,
              fontSize: '0.8125rem',
              fontWeight: 500,
              backgroundColor: '#3B82F6',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#2563EB',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E5E7EB',
                color: '#9CA3AF',
              },
            }}
            startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {isLoading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

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
