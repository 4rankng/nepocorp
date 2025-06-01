import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Box,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const ExcelTable = ({
  isLoading = false,
  error = null,
  columns = [],
  data = [],
  pagination = { pageIndex: 0, pageSize: 25 },
  onPageChange = () => {},
  onRowsPerPageChange = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onSave = () => {},
  onCancel = () => {},
  editingId = null,
  editedData = {},
  onInputChange = () => {},
  isSaving = false,
  showActions = true,
  showPagination = true,
  containerProps = {},
}) => {
  // Handle pagination
  const paginatedData = React.useMemo(() => {
    return data.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );
  }, [data, pagination.pageIndex, pagination.pageSize]);

  // Skeleton loading component
  const SkeletonTable = () => (
    <Box sx={{ width: '100%' }}>
      {[...Array(5)].map((_, index) => (
        <Box key={index} sx={{ height: 53, mb: 1, borderRadius: 1, bgcolor: 'action.hover' }} />
      ))}
    </Box>
  );

  if (isLoading) {
    return <SkeletonTable />;
  }

  if (error) {
    return <Alert severity="error">Không thể tải dữ liệu: {error.message}</Alert>;
  }

  return (
    <TableContainer component={Paper} {...containerProps}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || 'left'}
                sx={column.headerSx}
              >
                {column.label}
              </TableCell>
            ))}
            {showActions && <TableCell>Thao tác</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedData.map((row) => (
            <TableRow key={row.id} hover>
              {columns.map((column) => (
                <TableCell key={`${row.id}-${column.id}`} align={column.align || 'left'}>
                  {editingId === row.id && column.editable ? (
                    column.renderEdit ? (
                      column.renderEdit(editedData, onInputChange)
                    ) : (
                      <TextField
                        value={editedData[column.id] || ''}
                        onChange={(e) => onInputChange(column.id, e.target.value)}
                        size="small"
                        disabled={isSaving}
                        fullWidth
                        variant="outlined"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') onCancel();
                        }}
                        {...column.inputProps}
                      />
                    )
                  ) : column.render ? (
                    column.render(row)
                  ) : (
                    row[column.id]
                  )}
                </TableCell>
              ))}
              {showActions && (
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {editingId === row.id ? (
                      <>
                        <Tooltip title="Lưu">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={onSave}
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <CircularProgress size={20} />
                              ) : (
                                <CheckIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Hủy">
                          <span>
                            <IconButton size="small" onClick={onCancel} disabled={isSaving}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    ) : (
                      <>
                        <Tooltip title="Chỉnh sửa">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => onEdit(row)}
                              disabled={!!editingId}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Xóa">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => onDelete(row)}
                              disabled={!!editingId}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {showPagination && (
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={data.length}
          rowsPerPage={pagination.pageSize}
          page={pagination.pageIndex}
          onPageChange={(_, newPage) => onPageChange(newPage)}
          onRowsPerPageChange={(e) =>
            onRowsPerPageChange(parseInt(e.target.value, 10))
          }
          labelRowsPerPage="Số hàng mỗi trang:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} trong ${count !== -1 ? count : `nhiều hơn ${to}`}`
          }
        />
      )}
    </TableContainer>
  );
};

export default ExcelTable;
