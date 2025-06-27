import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton, ViewButton } from '@/components/ActionButtons';
import { PAYMENT_STATUS_LABELS } from '@constants/payment';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const ExpenseList = ({
  expenses = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  pagination = null,
  searchTerm = '',
  selectedCategory = '',
  categories = [],
  showCategoryColumn = true, // Option to show/hide category column
  CardComponent = null, // Custom card component for mobile view
  emptyMessage = 'Không có dữ liệu chi phí',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter expenses based on search and category
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(expense =>
        (expense.vendor_name && expense.vendor_name.toLowerCase().includes(search)) ||
        (expense.remark && expense.remark.toLowerCase().includes(search)) ||
        (expense.license_plate && expense.license_plate.toLowerCase().includes(search))
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(expense =>
        expense.expense_category_id === selectedCategory
      );
    }

    return filtered;
  }, [expenses, searchTerm, selectedCategory]);

  // Define table columns
  const tableColumns = useMemo(() => {
    const baseColumns = [
      {
        key: 'created_at',
        label: 'Ngày tạo',
        width: 100,
        sortable: true,
        render: (value) => formatDate(value),
      },
      {
        key: 'expense_category_id',
        label: 'Hạng mục',
        width: 120,
        sortable: true,
        render: (value) => {
          const category = categories.find(cat => cat.id === value);
          return category ? category.name : '-';
        },
      },
      {
        key: 'vendor_name',
        label: 'Nhà cung cấp',
        width: 150,
        sortable: true,
        render: (value, row) => {
          // Special handling for salary category
          const category = categories.find(cat => cat.id === row.expense_category_id);
          if (category && category.name === 'Lương') {
            // For salary, show recipient name if available
            return row.recipient_name || value || '-';
          }
          return value || '-';
        },
      },
      {
        key: 'total',
        label: 'Tổng tiền',
        width: 120,
        sortable: true,
        render: (value) => formatCurrency(value),
      },
      {
        key: 'payment_status',
        label: 'Trạng thái',
        width: 130,
        sortable: true,
        render: (value) => {
          const status = value;
          const label = PAYMENT_STATUS_LABELS[status] || status;
          const getStatusColor = () => {
            switch (status) {
              case 'DRAFT': return '#6b7280';
              case 'PENDING': return '#f59e0b';
              case 'PAID': return '#10b981';
              case 'CANCELLED': return '#ef4444';
              default: return '#6b7280';
            }
          };

          return (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                color: 'white',
                backgroundColor: getStatusColor(),
              }}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: 'remark',
        label: 'Ghi chú',
        width: 200,
        sortable: false,
        render: (value) => (
          <span title={value}>
            {value ? (value.length > 50 ? `${value.substring(0, 50)}...` : value) : '-'}
          </span>
        ),
      },
      {
        key: 'created_by',
        label: 'Người tạo',
        width: 120,
        sortable: true,
        render: (value, row) => {
          // If user info is embedded in the expense object
          if (row.created_by_user) {
            return row.created_by_user.name || row.created_by_user.email || '-';
          }
          // Otherwise just show the user ID or fetch separately
          return value || '-';
        },
      }
    ];

    return baseColumns;
  }, [categories]);

  // Render mobile card view
  const renderMobileView = () => {
    if (CardComponent) {
      return (
        <Box>
          {filteredExpenses.map(expense => (
            <CardComponent
              key={expense.id}
              expense={expense}
              onEdit={onEdit}
              onDelete={onDelete}
              categories={categories}
              isLoading={loading}
            />
          ))}
          {!loading && filteredExpenses.length === 0 && (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              {searchTerm || selectedCategory ? 'Không tìm thấy chi phí phù hợp' : emptyMessage}
            </Typography>
          )}
        </Box>
      );
    }

    // Default mobile card layout
    return (
      <Box>
        {filteredExpenses.map(expense => (
          <Box
            key={expense.id}
            sx={{
              p: 2,
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="h6" component="h3">
                {expense.license_plate}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ViewButton size="small" onClick={() => onView(expense)} />
                <EditButton size="small" onClick={() => onEdit(expense)} />
                <DeleteButton size="small" onClick={() => onDelete(expense)} />
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Nhà cung cấp:</strong> {expense.vendor_name}
            </Typography>

            {showCategoryColumn && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Loại chi phí:</strong> {
                  categories.find(cat => cat.id === expense.expense_category_id)?.name || '-'
                }
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Tổng tiền:</strong> {formatCurrency(expense.total)}
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Trạng thái:</strong> {PAYMENT_STATUS_LABELS[expense.payment_status] || expense.payment_status}
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Ngày tạo:</strong> {formatDate(expense.created_at)}
            </Typography>

            {expense.remark && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Ghi chú:</strong> {expense.remark}
              </Typography>
            )}
          </Box>
        ))}

        {!loading && filteredExpenses.length === 0 && (
          <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
            {searchTerm || selectedCategory ? 'Không tìm thấy chi phí phù hợp' : emptyMessage}
          </Typography>
        )}
      </Box>
    );
  };

  // Render desktop table view
  const renderDesktopView = () => {
    const tableProps = {
      columns: tableColumns,
      data: filteredExpenses,
      loading: loading,
      error: error?.message || (error ? 'Có lỗi xảy ra khi tải dữ liệu' : null),
      emptyMessage: searchTerm || selectedCategory ? 'Không tìm thấy chi phí phù hợp' : emptyMessage,
      pagination: !!pagination,
      rowKeyField: 'id',
    };

    // Add pagination props if provided
    if (pagination) {
      tableProps.page = pagination.page;
      tableProps.rowsPerPage = pagination.pageSize || pagination.rowsPerPage || 10;
      tableProps.totalCount = pagination.total;
      tableProps.onPageChange = (event, newPage) => {
        if (pagination.onPageChange) {
          pagination.onPageChange(newPage);
        }
      };
      tableProps.onRowsPerPageChange = (event) => {
        if (pagination.onRowsPerPageChange) {
          pagination.onRowsPerPageChange(parseInt(event.target.value, 10));
        }
      };
    }

    return (
      <StandardTable
        {...tableProps}
        renderActions={row => (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <ViewButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onView(row);
              }}
            />
            <EditButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                onEdit(row);
              }}
            />
            <DeleteButton
              size="small"
              color="error"
              onClick={e => {
                e.stopPropagation();
                onDelete(row);
              }}
            />
          </Box>
        )}
      />
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {isMobile ? renderMobileView() : renderDesktopView()}
    </Box>
  );
};

export default ExpenseList;
