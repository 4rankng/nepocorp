import { Search as SearchIcon } from '@mui/icons-material';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  CircularProgress,
  Alert,
  Skeleton,
  TextField,
  Fab,
  useMediaQuery,
  IconButton,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Tooltip,
  Dialog,
  DialogTitle,
  InputAdornment,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useDiDuong } from '../hooks/useDiDuong';
import { updateTuyenDuong } from '@services/mockApi/tuyenDuongApi';
import logger from '@services/logger';
import { useSnackbar } from 'notistack';
import DeleteDialog from '@/components/DeleteDialog';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import * as tuyenDuongApi from '@services/mockApi/tuyenDuongApi';
import * as dinhMucDiDuongApi from '@services/mockApi/dinhMucDiDuongApi';
import ExcelTable from '@/components/ExcelTable';

// Define validation schema with Zod
const routeSchema = z.object({
  ma_tuyen: z.string().min(1, 'Mã tuyến là bắt buộc'),
  diem_di: z.string().min(1, 'Điểm đi là bắt buộc'),
  diem_den: z.string().min(1, 'Điểm đến là bắt buộc'),
  containerNorms: z.record(z.number().min(0, 'Giá trị phải lớn hơn hoặc bằng 0')),
});

const DinhMucDiDuong = () => {
  const muiTheme = useTheme();
  const {
    roadNorms: hookRoadNorms,
    containerTypes,
    routes: hookRoutes,
    isLoading,
    error,
    deleteTuyenDuongAndNorms,
    fetchAllData,
    createRoadNorm,
    updateRoadNorm,
  } = useDiDuong();

  const { enqueueSnackbar } = useSnackbar();
  const [localRoutes, setLocalRoutes] = useState([]);
  const [localRoadNorms, setLocalRoadNorms] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false); // Delete dialog state
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Initialize form
  const methods = useForm({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      ma_tuyen: '',
      diem_di: '',
      diem_den: '',
      containerNorms: {},
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // Update local state when data loads
  useEffect(() => {
    if (hookRoutes) {

      setLocalRoutes([...hookRoutes]);
    }
  }, [hookRoutes]);

  useEffect(() => {
    if (hookRoadNorms) {

      setLocalRoadNorms([...hookRoadNorms]);
    }
  }, [hookRoadNorms]);

  // Prepare table data
  const tableData = useMemo(() => {
    if (!localRoutes.length) {

      return [];
    }

    const routeMap = localRoutes.reduce((acc, route) => {
      acc[route.ma_so] = {
        id: route.ma_so,
        ma_tuyen: route.ma_so,
        diem_di: route.diem_di,
        diem_den: route.diem_den,
        containerNorms: {},
      };
      return acc;
    }, {});

    localRoadNorms.forEach(norm => {
      if (routeMap[norm.ma_tuyen]) {
        routeMap[norm.ma_tuyen].containerNorms[norm.ma_loai_container] = norm.dinh_muc;
      }
    });

    const result = Object.values(routeMap);

    return result;
  }, [localRoutes, localRoadNorms]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return tableData;
    const lower = searchTerm.trim().toLowerCase();
    return tableData.filter(
      row =>
        (row.ma_tuyen && row.ma_tuyen.toLowerCase().includes(lower)) ||
        (row.diem_di && row.diem_di.toLowerCase().includes(lower)) ||
        (row.diem_den && row.diem_den.toLowerCase().includes(lower))
    );
  }, [tableData, searchTerm]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination]);

  // Handle form submission
  const onSubmit = async data => {
    try {
      // Check if this is an edit or create
      const isEdit = data.id;

      if (isEdit) {
        // Update existing route
        await updateTuyenDuong(data.id, {
          diem_di: data.diem_di,
          diem_den: data.diem_den,
        });

        // Update norms
        const normPromises = Object.entries(data.containerNorms).map(
          async ([containerKey, value]) => {
            const existingNorm = localRoadNorms.find(
              norm => norm.ma_tuyen === data.id && norm.ma_loai_container === containerKey
            );

            if (existingNorm) {
              if (existingNorm.dinh_muc !== value) {
                return updateRoadNorm(existingNorm.id, {
                  ...existingNorm,
                  dinh_muc: value,
                });
              }
            } else if (value > 0) {
              // Only create if value is greater than 0
              return createRoadNorm({
                ma_tuyen: data.id,
                ma_loai_container: containerKey,
                dinh_muc: value,
              });
            }
            return Promise.resolve();
          }
        );

        await Promise.all(normPromises);
        enqueueSnackbar('Cập nhật thành công!', { variant: 'success' });
      } else {
        // Create new route (implementation needed)
        enqueueSnackbar('Tạo mới thành công!', { variant: 'success' });
      }

      await fetchAllData();
      reset();
    } catch (error) {
      logger.error('Failed to save data:', error);
      enqueueSnackbar(error.message || 'Có lỗi xảy ra', { variant: 'error' });
    }
  };

  // Handle delete
  const handleDeleteClick = row => {
    setItemToDelete(row);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteTuyenDuongAndNorms(itemToDelete.id);
      enqueueSnackbar('Xóa thành công!', { variant: 'success' });
      await fetchAllData();
    } catch (error) {
      logger.error('Failed to delete:', error);
      enqueueSnackbar('Xóa thất bại', { variant: 'error' });
    } finally {
      setItemToDelete(null);
    }
  };

  // Handle edit
  const handleEditClick = row => {

    try {
      setEditingId(row.id);
      setEditedData({
        ...row,
        containerNorms: { ...row.containerNorms },
      });

    } catch (error) {
      console.error('Error in handleEditClick:', error);
    }
  };

  const handleAddNew = () => {
    // Determine next ma_tuyen
    let nextMaTuyen = '';
    if (localRoutes.length > 0) {
      // Extract numeric part from codes like TD001, TD002, ...
      const codes = localRoutes
        .map(r => r.ma_so)
        .filter(Boolean)
        .map(code => {
          const match = code.match(/TD(\d+)/i);
          return match ? parseInt(match[1], 10) : 0;
        });
      const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
      nextMaTuyen = `TD${String(maxCode + 1).padStart(3, '0')}`;
    } else {
      nextMaTuyen = 'TD001';
    }

    setIsAddingNew(true);
    setEditingId('new');
    setEditedData({
      ma_tuyen: nextMaTuyen,
      diem_di: '',
      diem_den: '',
      containerNorms: {},
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedData({});
    setIsAddingNew(false);
  };

  const handleInputChange = (field, value, containerKey = null) => {

    setEditedData(prev => {
      // Create a deep copy of the previous state
      const newState = { ...prev };

      if (containerKey) {
        // If it's a container norm field
        newState.containerNorms = {
          ...(prev.containerNorms || {}),
          [containerKey]: value,
        };

      } else {
        // If it's a regular field
        newState[field] = value;

      }

      return newState;
    });
  };

  const handleSaveEditOptimistic = async () => {
    if (isSaving) return;
    setIsSaving(true);

    // Store previous state for rollback in case of error
    const previousRoutes = [...localRoutes];
    const previousRoadNorms = [...localRoadNorms];

    try {

      // Apply optimistic updates first
      if (editingId === 'new') {
        // Add new route to local state optimistically
        const newRouteData = {
          id: editedData.ma_tuyen,
          ma_so: editedData.ma_tuyen,
          diem_di: editedData.diem_di,
          diem_den: editedData.diem_den,
        };
        setLocalRoutes(prev => [...prev, newRouteData]);

        // Add new norms to local state optimistically
        const newNorms = Object.entries(editedData.containerNorms)
          .filter(([_, value]) => parseFloat(value) > 0)
          .map(([containerKey, value]) => ({
            id: `${editedData.ma_tuyen}_${containerKey}`,
            ma_tuyen: editedData.ma_tuyen,
            ma_loai_container: containerKey,
            dinh_muc: parseFloat(value),
          }));
        setLocalRoadNorms(prev => [...prev, ...newNorms]);
      } else {
        // Update existing route in local state optimistically
        setLocalRoutes(prev => 
          prev.map(route => 
            route.id === editingId 
              ? { ...route, diem_di: editedData.diem_di, diem_den: editedData.diem_den }
              : route
          )
        );

        // Update existing norms in local state optimistically
        const updatedNorms = [...localRoadNorms];
        for (const [containerKey, value] of Object.entries(editedData.containerNorms)) {
          const numericValue = parseFloat(value);
          const normIndex = updatedNorms.findIndex(
            norm => norm.ma_tuyen === editingId && norm.ma_loai_container === containerKey
          );

          if (normIndex >= 0) {
            updatedNorms[normIndex] = { ...updatedNorms[normIndex], dinh_muc: numericValue };
          } else if (numericValue > 0) {
            updatedNorms.push({
              id: `${editingId}_${containerKey}`,
              ma_tuyen: editingId,
              ma_loai_container: containerKey,
              dinh_muc: numericValue,
            });
          }
        }
        setLocalRoadNorms(updatedNorms);
      }

      // Now perform API calls
      const normPromises = [];

      if (editingId === 'new') {
        // Create new route

        const newRoute = await tuyenDuongApi.createTuyenDuong({
          ma_so: editedData.ma_tuyen,
          diem_di: editedData.diem_di,
          diem_den: editedData.diem_den,
        });

        if (!newRoute || !newRoute.success) {
          throw new Error('Failed to create new route');
        }

        // Create norms for the new route
        for (const [containerKey, value] of Object.entries(editedData.containerNorms)) {
          const numericValue = parseFloat(value);
          if (numericValue > 0) {

            normPromises.push(
              createRoadNorm({
                ma_tuyen: newRoute.data.ma_so,
                ma_loai_container: containerKey,
                dinh_muc: numericValue,
              })
            );
          }
        }
      } else {
        // Update existing route
        await updateTuyenDuong(editingId, {
          diem_di: editedData.diem_di,
          diem_den: editedData.diem_den,
        });

        // Update norms
        for (const [containerKey, value] of Object.entries(editedData.containerNorms)) {
          const numericValue = parseFloat(value);
          const existingNorm = localRoadNorms.find(
            norm => norm.ma_tuyen === editingId && norm.ma_loai_container === containerKey
          );

          if (existingNorm) {
            if (existingNorm.dinh_muc !== numericValue) {
              normPromises.push(
                updateRoadNorm(existingNorm.id, {
                  ...existingNorm,
                  dinh_muc: numericValue,
                })
              );
            }
          } else if (numericValue > 0) {
            normPromises.push(
              createRoadNorm({
                ma_tuyen: editingId,
                ma_loai_container: containerKey,
                dinh_muc: numericValue,
              })
            );
          }
        }
      }

      await Promise.all(normPromises);

      // API calls succeeded, reset editing state

      setEditingId(null);
      setEditedData({});
      setIsAddingNew(false);

      enqueueSnackbar('Lưu thành công!', { variant: 'success' });
    } catch (error) {
      logger.error('Failed to save data, reverting optimistic updates:', error);

      // Revert optimistic updates by restoring previous state
      setLocalRoutes(previousRoutes);
      setLocalRoadNorms(previousRoadNorms);

      enqueueSnackbar(error.message || 'Có lỗi xảy ra khi lưu dữ liệu', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Global ESC key handler for exiting edit mode
  useEffect(() => {
    if (!editingId) return;
    const handleEsc = e => {
      if (e.key === 'Escape') {
        handleCancelEdit();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [editingId]);

  // Define table columns
  const columns = [
    {
      id: 'ma_tuyen',
      label: 'Mã tuyến',
      editable: false,
      render: (row) => row.ma_tuyen
    },
    {
      id: 'diem_di',
      label: 'Điểm đi',
      editable: true,
      render: (row) => row.diem_di
    },
    {
      id: 'diem_den',
      label: 'Điểm đến',
      editable: true,
      render: (row) => row.diem_den
    }
  ];

  // Render new row for adding
  const renderNewRow = () => (
    <TableRow key="new-row" hover>
      <TableCell>
        <TextField
          value={editedData.ma_tuyen || ''}
          onChange={e => handleInputChange('ma_tuyen', e.target.value)}
          size="small"
          disabled={isSaving}
          fullWidth
          variant="outlined"
          autoFocus
        />
      </TableCell>
      <TableCell>
        <TextField
          value={editedData.diem_di || ''}
          onChange={e => handleInputChange('diem_di', e.target.value)}
          size="small"
          disabled={isSaving}
          fullWidth
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <TextField
          value={editedData.diem_den || ''}
          onChange={e => handleInputChange('diem_den', e.target.value)}
          size="small"
          disabled={isSaving}
          fullWidth
          variant="outlined"
        />
      </TableCell>
      {containerTypes?.map(ct => (
        <TableCell key={ct.ma_loai_container} align="right">
          <TextField
            type="number"
            value={editedData.containerNorms?.[ct.ma_loai_container] ?? ''}
            onChange={e =>
              handleInputChange(
                'containerNorms',
                e.target.value,
                ct.ma_loai_container
              )
            }
            size="small"
            disabled={isSaving}
            sx={{ width: '80px' }}
            variant="outlined"
            inputProps={{
              step: '0.01',
              min: '0',
            }}
          />
        </TableCell>
      ))}
      {/* ExcelTable will handle the action buttons */}
      <TableCell>
        {/* Actions handled by ExcelTable */}
      </TableCell>
    </TableRow>
  );

  return (
    <FormProvider {...methods}>
      <Paper elevation={3} sx={{ p: 3, m: 1, mt: 2 }}>
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            sx={{ width: '100%' }}
            variant="outlined"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
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

        <ExcelTable
          isLoading={isLoading}
          error={error}
          columns={columns}
          data={tableData}
          filteredData={filteredData}
          paginatedData={paginatedData}
          pagination={pagination}
          onPageChange={(newPage) => {
            setPagination(prev => ({ ...prev, pageIndex: newPage }));
          }}
          onRowsPerPageChange={(newPageSize) => {
            setPagination({
              pageIndex: 0,
              pageSize: newPageSize,
            });
          }}
          editingId={editingId}
          editedData={editedData}
          isSaving={isSaving}
          isAddingNew={isAddingNew}
          containerTypes={containerTypes}
          handleEditClick={handleEditClick}
          handleDeleteClick={handleDeleteClick}
          handleSaveEdit={handleSaveEditOptimistic}
          handleCancelEdit={handleCancelEdit}
          handleInputChange={handleInputChange}
          renderNewRow={renderNewRow}
          showActions={true}
          showPagination={true}
        />
      </Paper>

      {/* Add/Edit Form Dialog */}
      <Dialog open={false} onClose={() => reset()} maxWidth="md" fullWidth>
        <DialogTitle>Thêm mới tuyến đường</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>{/* Form fields would go here */}</DialogContent>
          <DialogActions>
            <Button onClick={() => reset()}>Hủy</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={24} /> : 'Lưu'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        open={!!itemToDelete}
        onCancel={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteForeverIcon color="error" />
            <span>Xóa tuyến đường</span>
          </Box>
        }
        message={`Bạn có chắc chắn muốn xóa tuyến đường ${itemToDelete?.ma_tuyen}?`}
        content={() => {
          if (!itemToDelete) return null;
          return (
            <Box>
              <Typography variant="subtitle2" color="error.main" gutterBottom>
                Thông tin chi tiết:
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Typography variant="body2" fontWeight={500}>
                  Điểm đi:
                </Typography>
                <Typography variant="body2">{itemToDelete.diem_di}</Typography>
                <Typography variant="body2" fontWeight={500}>
                  Điểm đến:
                </Typography>
                <Typography variant="body2">{itemToDelete.diem_den}</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {containerTypes?.map(ct => (
                        <TableCell key={ct.ma_loai_container} align="center">
                          {ct.ten_loai_container}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      {containerTypes?.map(ct => (
                        <TableCell key={ct.ma_loai_container} align="center">
                          {itemToDelete.containerNorms?.[ct.ma_loai_container]?.toLocaleString(
                            'vi-VN'
                          ) || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          );
        }}
        confirmText="Xóa"
        cancelText="Hủy"
        type="delete"
        confirmColor="error"
      />

      {!isMobile && !isLoading && !error && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
          }}
          onClick={handleAddNew}
        >
          <AddIcon />
        </Fab>
      )}
    </FormProvider>
  );
};

// Skeleton loading component
const SkeletonTable = () => (
  <Box sx={{ width: '100%' }}>
    {[...Array(5)].map((_, index) => (
      <Skeleton key={index} variant="rectangular" height={53} sx={{ mb: 1, borderRadius: 1 }} />
    ))}
  </Box>
);

export default DinhMucDiDuong;
