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
  Typography,
  Skeleton,
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
  filteredData = [],
  paginatedData = [],
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
  // New props for enhanced functionality
  isAddingNew = false,
  containerTypes = [],
  handleEditClick = () => {},
  handleDeleteClick = () => {},
  handleSaveEdit = () => {},
  handleCancelEdit = () => {},
  handleInputChange = () => {},
  // Custom render functions
  renderNewRow = null,
  renderCustomCell = null,
}) => {
  // Handle pagination if not provided externally
  const computedPaginatedData = React.useMemo(() => {
    if (paginatedData && paginatedData.length > 0) {
      return paginatedData;
    }
    const dataToUse = filteredData.length > 0 ? filteredData : data;
    return dataToUse.slice(
      pagination.pageIndex * pagination.pageSize,
      (pagination.pageIndex + 1) * pagination.pageSize
    );
  }, [data, filteredData, paginatedData, pagination.pageIndex, pagination.pageSize]);

  // Skeleton loading component
  const SkeletonTable = () => (
    <Box sx={{ width: '100%' }}>
      {[...Array(5)].map((_, index) => (
        <Skeleton key={index} variant="rectangular" height={53} sx={{ mb: 1, borderRadius: 1 }} />
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
    <>
      {isLoading ? (
        <SkeletonTable />
      ) : error ? (
        <Alert severity="error">Không thể tải dữ liệu: {error.message}</Alert>
      ) : (
        <>
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
                  {/* Dynamic container type columns */}
                  {containerTypes?.map(ct => (
                    <TableCell key={ct.ma_loai_container} align="right">
                      {ct.ten_loai_container}
                    </TableCell>
                  ))}
                  {showActions && <TableCell>Thao tác</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* New row for adding */}
                {isAddingNew && editingId === 'new' && renderNewRow && renderNewRow()}

                {/* Regular data rows */}
                {computedPaginatedData.map((row) => (
                  <TableRow key={row.id} hover>
                    {columns.map((column) => (
                      <TableCell key={`${row.id}-${column.id}`} align={column.align || 'left'}>
                        {editingId === row.id && column.editable ? (
                          column.renderEdit ? (
                            column.renderEdit(editedData, handleInputChange)
                          ) : (
                            <TextField
                              value={editedData[column.id] || ''}
                              onChange={(e) => handleInputChange(column.id, e.target.value)}
                              size="small"
                              disabled={isSaving}
                              fullWidth
                              variant="outlined"
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') handleCancelEdit();
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

                    {/* Dynamic container type columns */}
                    {containerTypes?.map(ct => (
                      <TableCell key={ct.ma_loai_container} align="right">
                        {editingId === row.id ? (
                          <TextField
                            type="number"
                            value={editedData.containerNorms?.[ct.ma_loai_container] ?? ''}
                            onChange={e => {
                              const value = e.target.value;
                              handleInputChange('containerNorms', value, ct.ma_loai_container);
                            }}
                            size="small"
                            disabled={isSaving}
                            sx={{ width: '80px' }}
                            variant="outlined"
                            inputProps={{
                              step: '0.01',
                              min: '0',
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                          />
                        ) : (
                          row.containerNorms?.[ct.ma_loai_container]?.toLocaleString('vi-VN') || '-'
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
                                    onClick={handleSaveEdit}
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
                                  <IconButton
                                    size="small"
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                  >
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
                                    onClick={() => handleEditClick(row)}
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
                                    onClick={() => handleDeleteClick(row)}
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
          </TableContainer>

          {showPagination && (
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredData.length > 0 ? filteredData.length : data.length}
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
        </>
      )}
    </>
  );
};

export default ExcelTable;
