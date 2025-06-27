import React from 'react';
import {
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Paper,
  IconButton,
  TextField,
  Tooltip,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const DinhMucTable = ({
  paginatedData,
  filteredData,
  containerTypes,
  pagination,
  setPagination,
  editingId,
  editedData,
  isSaving,
  isLoading,
  error,
  onEditClick,
  onCancelEdit,
  onDeleteClick,
  onInputChange,
  onSubmit,
}) => {
  const formatCurrency = (value) => {
    if (!value || value === 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({ ...prev, pageIndex: newPage }));
  };

  const handleRowsPerPageChange = (event) => {
    setPagination(prev => ({
      ...prev,
      pageSize: parseInt(event.target.value, 10),
      pageIndex: 0,
    }));
  };

  const handleSaveEdit = () => {
    onSubmit(editedData);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Có lỗi xảy ra khi tải dữ liệu: {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 120, fontWeight: 'bold' }}>Mã tuyến</TableCell>
              <TableCell sx={{ minWidth: 150, fontWeight: 'bold' }}>Điểm đi</TableCell>
              <TableCell sx={{ minWidth: 150, fontWeight: 'bold' }}>Điểm đến</TableCell>
              {containerTypes?.map(container => (
                <TableCell
                  key={container.ma_loai_cont}
                  sx={{ minWidth: 150, fontWeight: 'bold', textAlign: 'center' }}
                >
                  {container.ten_loai_cont}
                  <Typography variant="caption" display="block" color="text.secondary">
                    (VND)
                  </Typography>
                </TableCell>
              ))}
              <TableCell sx={{ minWidth: 100, fontWeight: 'bold', textAlign: 'center' }}>
                Thao tác
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={4 + (containerTypes?.length || 0)} 
                  sx={{ textAlign: 'center', py: 4 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Không có dữ liệu
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row) => {
                const isEditing = editingId === row.id;
                
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editedData.ma_tuyen || ''}
                          onChange={(e) => onInputChange('ma_tuyen', e.target.value)}
                          disabled={isSaving}
                          fullWidth
                        />
                      ) : (
                        row.ma_tuyen
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editedData.diem_di || ''}
                          onChange={(e) => onInputChange('diem_di', e.target.value)}
                          disabled={isSaving}
                          fullWidth
                        />
                      ) : (
                        row.diem_di
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editedData.diem_den || ''}
                          onChange={(e) => onInputChange('diem_den', e.target.value)}
                          disabled={isSaving}
                          fullWidth
                        />
                      ) : (
                        row.diem_den
                      )}
                    </TableCell>
                    {containerTypes?.map(container => (
                      <TableCell key={container.ma_loai_cont} sx={{ textAlign: 'right' }}>
                        {isEditing ? (
                          <TextField
                            size="small"
                            type="number"
                            value={editedData.containerNorms?.[container.ma_loai_cont] || 0}
                            onChange={(e) => onInputChange('containerNorms', e.target.value, container.ma_loai_cont)}
                            disabled={isSaving}
                            fullWidth
                            inputProps={{ min: 0 }}
                          />
                        ) : (
                          formatCurrency(row.containerNorms?.[container.ma_loai_cont] || 0)
                        )}
                      </TableCell>
                    ))}
                    <TableCell sx={{ textAlign: 'center' }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Lưu">
                            <IconButton
                              size="small"
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                              color="primary"
                            >
                              {isSaving ? <CircularProgress size={16} /> : <CheckIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Hủy">
                            <IconButton
                              size="small"
                              onClick={onCancelEdit}
                              disabled={isSaving}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => onEditClick(row)}
                              color="primary"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa">
                            <IconButton
                              size="small"
                              onClick={() => onDeleteClick(row)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {filteredData.length > 0 && (
        <TablePagination
          component="div"
          count={filteredData.length}
          page={pagination.pageIndex}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.pageSize}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Số dòng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} của ${count !== -1 ? count : `hơn ${to}`}`
          }
        />
      )}
    </Paper>
  );
};

export default DinhMucTable;