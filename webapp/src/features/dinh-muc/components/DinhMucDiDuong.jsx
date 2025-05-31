import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  CircularProgress,
  Alert,
  Skeleton,
  TextField, // Re-added for inline editing
  Fab,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon, Check as CheckIcon, Edit as EditIcon } from '@mui/icons-material';
import { StandardTable, DeleteButton, SearchBar } from '@components'; // EditButton will be handled by IconButton now
import IconButton from '@mui/material/IconButton';
import { useDiDuong } from '../hooks/useDiDuong';
import { updateTuyenDuong } from '@services/mockApi/tuyenDuongApi';
import logger from '@services/logger';
import { useSnackbar } from 'notistack';

import DinhMucDiDuongDeleteDialog from './DinhMucDiDuongDeleteDialog'; // Import the new dialog

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
    createRoadNorm, // Added from useDiDuong
    updateRoadNorm, // Added from useDiDuong
  } = useDiDuong();
  const { enqueueSnackbar } = useSnackbar();

  const [localRoutes, setLocalRoutes] = useState([]);
  const [localRoadNorms, setLocalRoadNorms] = useState([]);

  useEffect(() => {
    if (hookRoutes) {
      setLocalRoutes(JSON.parse(JSON.stringify(hookRoutes))); // Deep copy
    }
  }, [hookRoutes]);

  useEffect(() => {
    if (hookRoadNorms) {
      setLocalRoadNorms(JSON.parse(JSON.stringify(hookRoadNorms))); // Deep copy
    }
  }, [hookRoadNorms]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCount, setFilteredCount] = useState(0);
  // Editing state
  const [editingRowId, setEditingRowId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const tableContainerRef = useRef(null);
  // Sort container types by name (e.g., "20'", "40'") for consistent column order
  const sortedContainerTypes = useMemo(() => {
    return [...containerTypes].sort((a, b) => {
      // Extract numbers for sorting, e.g., 20 from "20'"
      const numA = parseInt(a.ten_loai_container, 10) || 0;
      const numB = parseInt(b.ten_loai_container, 10) || 0;
      return numA - numB;
    });
  }, [containerTypes]);
  // Handle starting edit action
  const handleEdit = (e, rowData) => {
    e.stopPropagation();
    setEditingRowId(rowData.id);
    // Deep copy to avoid mutating original tableData, especially nested containerNorms
    setEditedData(JSON.parse(JSON.stringify(rowData)));
  };

  // Handle confirm edit action
  const handleConfirmEdit = useCallback(
    async e => {
      e.stopPropagation();
      if (!editedData || !editedData.id) {
        logger.warn('handleConfirmEdit called with no editedData or no ID.');
        return;
      }

      setIsSaving(true);
      try {
        const routeToUpdate = localRoutes.find(r => r.ma_so === editedData.id);
        if (!routeToUpdate || !routeToUpdate.id) {
          throw new Error(
            `Route with ma_so ${editedData.id} not found or has no numeric ID for update.`
          );
        }

        const routeUpdatePayload = {
          diem_di: editedData.diem_di,
          diem_den: editedData.diem_den,
        };
        await updateTuyenDuong(routeToUpdate.id, routeUpdatePayload);

        const normPromises = Object.keys(editedData.containerNorms).map(async containerKey => {
          const newDinhMucValue = parseFloat(editedData.containerNorms[containerKey]) || 0;
          const existingNorm = localRoadNorms.find(
            norm => norm.ma_tuyen === editedData.id && norm.ma_loai_container === containerKey
          );

          if (existingNorm) {
            if (existingNorm.dinh_muc !== newDinhMucValue) {
              await updateRoadNorm(existingNorm.id, { ...existingNorm, dinh_muc: newDinhMucValue });
            }
          } else {
            await createRoadNorm({
              ma_tuyen: editedData.id,
              ma_loai_container: containerKey,
              dinh_muc: newDinhMucValue,
              // Other fields like ma_cont might be derived by the backend or mock API from ma_loai_container
            });
          }
        });

        await Promise.all(normPromises);

        // 4. Refetch all data to update UI from the 'source of truth'
        await fetchAllData();

        enqueueSnackbar('Dữ liệu đã được cập nhật thành công!', { variant: 'success' });
        setEditingRowId(null);
        setEditedData({});
      } catch (err) {
        logger.error('Failed to save DinhMucDiDuong data:', err);
        let errorMessage = 'Lỗi khi cập nhật dữ liệu. Vui lòng thử lại.';
        if (err.response && err.response.data && err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.message) {
          errorMessage = err.message;
        }
        enqueueSnackbar(errorMessage, { variant: 'error' });
      } finally {
        setIsSaving(false);
      }
    },
    [
      editedData,
      localRoutes,
      localRoadNorms,
      updateRoadNorm,
      createRoadNorm,
      fetchAllData,
      enqueueSnackbar,
    ]
  );

  // Handle delete action - open dialog
  const handleDelete = rowData => {
    setItemToDelete(rowData);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !itemToDelete.id) {
      // console.warn('Item to delete or its ID is missing.'); // Warning removed, should be handled by logger
      // enqueueSnackbar('Không có mục nào được chọn để xóa hoặc thiếu ID.', { variant: 'warning' });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      return;
    }

    try {
      // Call the new hook function to delete the route and all its norms
      await deleteTuyenDuongAndNorms(itemToDelete.id);
      // enqueueSnackbar('Đã xóa tuyến đường và các định mức liên quan thành công!', { variant: 'success' });
    } catch (error) {
      // console.error('Failed to delete route and its norms:', error); // Error removed, should be handled by logger
      // enqueueSnackbar(
      //   `Lỗi xóa tuyến đường: ${error.message || 'Unknown error'}`,
      //   { variant: 'error' }
      // );
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      // Data updates are handled by the useDiDuong hook
    }
  };

  // Render action buttons for each row
  const renderActionsRow = (rowData) => { // Changed signature for clarity with renderCell
    const isCurrentlySavingThisRow = isSaving && editingRowId === rowData.id;
    if (rowData.id === editingRowId) {
      return (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
        >
          <IconButton
            aria-label="confirm edit"
            onClick={handleConfirmEdit}
            size="small"
            color="primary"
            disabled={isCurrentlySavingThisRow}
          >
            {isCurrentlySavingThisRow ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckIcon fontSize="small" />
            )}
          </IconButton>
          <DeleteButton
            onClick={e => {
              e.stopPropagation(); // Keep for delete to prevent row click if needed
              handleDelete(rowData);
            }}
            size="small"
            sx={{ ml: 1 }}
            disabled // Always disable delete when in edit mode for this row
          />
        </Box>
      );
    }
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <IconButton
          aria-label="edit"
          onClick={e => handleEdit(e, rowData)}
          size="small"
          disabled={isSaving} // Disable edit button on other rows if any save is in progress
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <DeleteButton
          onClick={e => {
            e.stopPropagation(); // Keep stopPropagation
            handleDelete(rowData);
          }}
          size="small"
          sx={{ ml: 1 }}
          disabled={isSaving} // Disable delete button on other rows if any save is in progress
        />
      </Box>
    );
  };

  // Prepare columns for StandardTable
  const handleInputChange = (e, field, containerKey = null) => {
    const { value } = e.target;
    setEditedData(prev => {
      const newData = { ...prev };
      if (containerKey) {
        if (!newData.containerNorms) {
          newData.containerNorms = {};
        }
        newData.containerNorms[containerKey] = value;
      } else {
        newData[field] = value;
      }
      return newData;
    });
  };

  const columns = useMemo(
    () => [
      {
        field: 'ma_tuyen', // key -> field
        headerName: 'Mã tuyến', // label -> headerName
        width: 120, // '10%' -> numeric
        sortable: true,
        renderCell: (params) => { // render -> renderCell
          const { row: rowData, value: cellValue } = params;
          if (rowData.id === editingRowId) {
            return (
              <TextField
                value={editedData.ma_tuyen || ''}
                onChange={e => handleInputChange(e, 'ma_tuyen')}
                size="small"
                variant="outlined"
                onClick={e => e.stopPropagation()} // Prevent row click-outside when clicking input
                inputProps={{
                  style: { fontSize: '0.4rem', paddingTop: '0px', paddingBottom: '0px' },
                }} // Very small text & no vertical padding
                fullWidth
              />
            );
          }
          return (
            <Typography variant="body2" fontWeight={500}>
              {rowData.ma_tuyen}
            </Typography>
          );
        },
      },
      {
        field: 'diem_di', // key -> field
        headerName: 'Điểm đi', // label -> headerName
        width: 150, // '10%' -> numeric
        sortable: true,
        renderCell: (params) => { // render -> renderCell
          const { row: rowData, value: cellValue } = params;
          if (rowData.id === editingRowId) {
            return (
              <TextField
                value={editedData.diem_di || ''}
                onChange={e => handleInputChange(e, 'diem_di')}
                size="small"
                variant="outlined"
                onClick={e => e.stopPropagation()}
                inputProps={{
                  style: { fontSize: '0.4rem', paddingTop: '0px', paddingBottom: '0px' },
                }} // Very small text & minimal padding
                fullWidth
              />
            );
          }
          return <Typography variant="body2">{rowData.diem_di}</Typography>;
        },
      },
      {
        field: 'diem_den', // key -> field
        headerName: 'Điểm đến', // label -> headerName
        width: 250, // '20%' -> numeric
        sortable: true,
        renderCell: (params) => { // render -> renderCell
          const { row: rowData, value: cellValue } = params;
          if (rowData.id === editingRowId) {
            return (
              <TextField
                value={editedData.diem_den || ''}
                onChange={e => handleInputChange(e, 'diem_den')}
                size="small"
                variant="outlined"
                onClick={e => e.stopPropagation()}
                inputProps={{
                  style: { fontSize: '0.4rem', paddingTop: '0px', paddingBottom: '0px' },
                }} // Very small text & no vertical padding
                fullWidth
              />
            );
          }
          return <Typography variant="body2">{rowData.diem_den}</Typography>;
        },
      },
      ...sortedContainerTypes.map(ct => ({
        field: `container_${ct.ma_loai_container}`, // key -> field
        headerName: ct.ten_loai_container, // label -> headerName
        width: 120, // Default width for dynamic columns
        align: 'right',
        headerAlign: 'right',
        sortable: true,
        renderCell: (params) => { // render -> renderCell
          const { row: rowData, value: cellValue } = params;
          const containerKey = ct.ma_loai_container;
          if (rowData.id === editingRowId) {
            const normValue = editedData.containerNorms?.[containerKey];
            return (
              <TextField
                value={normValue !== undefined ? normValue : ''}
                onChange={e => handleInputChange(e, 'containerNorms', containerKey)}
                size="small"
                variant="outlined"
                type="number" // Assuming norms are numbers
                onClick={e => e.stopPropagation()}
                inputProps={{
                  style: { fontSize: '0.4rem', paddingTop: '0px', paddingBottom: '0px' },
                }} // Very small text & no vertical padding
                fullWidth
              />
            );
          }
          const displayNormValue = rowData.containerNorms?.[containerKey];
          return (
            <Typography variant="body2">
              {displayNormValue !== undefined
                ? parseFloat(displayNormValue).toLocaleString('vi-VN')
                : '-'}
            </Typography>
          );
        },
      })),
      {
        field: 'actions', // key -> field
        headerName: 'Thao tác', // label -> headerName
        width: 150, // '15%' -> numeric
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params) => renderActionsRow(params.row), // render -> renderCell, adapt signature
      },
    ],
    [sortedContainerTypes, renderActionsRow, editingRowId, editedData, handleInputChange] // Ensure renderActionsRow is in dependency array
  );
  // Transform data for StandardTable - group by routes and container types
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = event => {
      if (
        editingRowId &&
        tableContainerRef.current &&
        !tableContainerRef.current.contains(event.target)
      ) {
        // Clicked outside the table container while a row is being edited
        setEditingRowId(null);
        setEditedData({}); // Discard changes
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingRowId]);

  // Handle ESC key press to cancel editing
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape' && editingRowId) {
        setEditingRowId(null);
        setEditedData({});
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingRowId, setEditingRowId, setEditedData]);

  const tableData = useMemo(() => {
    // Create a map of routes from localRoutes
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
    // Fill in the norm values for each route and container type from localRoadNorms
    localRoadNorms.forEach(norm => {
      const routeKey = norm.ma_tuyen;
      const containerKey = norm.ma_loai_container;
      // If the route exists in our map
      if (routeMap[routeKey]) {
        // Add the norm value for this container type
        routeMap[routeKey].containerNorms[containerKey] = norm.dinh_muc;
      }
    });
    // Convert the map to an array for the table
    return Object.values(routeMap);
  }, [localRoutes, localRoadNorms, sortedContainerTypes]); // Added sortedContainerTypes as it's used in column generation indirectly affecting table display logic

  // Filtered data by search term
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

  // Paginated data
  const paginatedData = useMemo(() => {
    if (!tableData) return []; // Ensure tableData is available
    const lowerSearchTerm = searchTerm.trim().toLowerCase();
    const currentFilteredData = lowerSearchTerm
      ? tableData.filter(
          row =>
            (row.ma_tuyen && row.ma_tuyen.toLowerCase().includes(lowerSearchTerm)) ||
            (row.diem_di && row.diem_di.toLowerCase().includes(lowerSearchTerm)) ||
            (row.diem_den && row.diem_den.toLowerCase().includes(lowerSearchTerm))
          // Add search for norm values if needed
        )
      : tableData;

    setFilteredCount(currentFilteredData.length); // Update count for pagination
    const start = page * rowsPerPage;
    return currentFilteredData.slice(start, start + rowsPerPage);
  }, [tableData, searchTerm, page, rowsPerPage]);

  const handlePageChange = (_event, newPage) => {
    setPage(newPage);
  };
  const handleRowsPerPageChange = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  const handleAddNew = () => {
    // TODO: Implement add new functionality
  };

  return (
    <>
      <DinhMucDiDuongDeleteDialog
        open={deleteDialogOpen}
        rowData={itemToDelete}
        containerTypes={sortedContainerTypes}
        onClose={handleCloseDeleteDialog}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
      />
      <Paper
        ref={tableContainerRef}
        elevation={3}
        sx={{ p: muiTheme.spacing(3), m: muiTheme.spacing(1), mt: 2 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <SearchBar
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm kiếm Mã tuyến, Điểm đi, Điểm đến..."
            containerSx={{ width: '100%', mb: 2 }} // Ensure full width and apply margin
            // fullWidth is true by default in SearchBar
          />
        </Box>

        {isLoading && (
          <Box
            sx={{
              width: '100%',
              minHeight: 200,
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Skeleton variant="rectangular" width="100%" height={48} sx={{ mb: 1 }} />
            {[...Array(5)].map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width="100%"
                height={52}
                sx={{ mb: 0.5 }}
              />
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
              <CircularProgress size={24} sx={{ mr: 1 }} />
              <Typography variant="body2">Đang tải dữ liệu...</Typography>
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Không thể tải dữ liệu định mức đi đường: {error.message || JSON.stringify(error)}
          </Alert>
        )}

        {!isLoading && !error && (
          <>
            {/* The duplicate search TextField that was here (lines 435-456 in previous view) has been removed. */}
            <StandardTable
              columns={columns}
              rows={paginatedData} // data -> rows
              loading={isLoading}
              emptyMessage={
                searchTerm
                  ? `Không tìm thấy kết quả cho "${searchTerm}"`
                  : 'Chưa có dữ liệu định mức đi đường'
              }
              rowKeyField="id" // This is used by StandardTable to pick the ID field from your row data.
              pagination
              rowCount={filteredCount} // count -> rowCount (StandardTable should handle this mapping)
              page={page}
              rowsPerPage={rowsPerPage} // pageSize in DataGrid, StandardTable maps this
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              // No onSortChange was used, so client-side sort is fine.
              // renderActions prop is not used here as actions are defined as a column.
            />
          </>
        )}
      </Paper>

      {!isMobile && !isLoading && !error && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: muiTheme.spacing(4),
            right: muiTheme.spacing(4),
          }}
          onClick={handleAddNew}
        >
          <AddIcon />
        </Fab>
      )}
    </>
  );
};

export default DinhMucDiDuong;
