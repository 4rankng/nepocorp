import React, { useMemo } from 'react';
import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { DeleteButton, ViewButton } from '@/components/ActionButtons';
import { INVOICE_STATUS_LABELS } from '@constants/invoice';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDate = dateString => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const InvoiceList = ({
  invoices = [],
  loading = false,
  error = null,
  onView,
  onEdit,
  onDelete,
  pagination = null,
  searchTerm = '',
  selectedCategory = '',
  categories = [],
  showCategoryColumn = true,
  CardComponent = null,
  emptyMessage = 'Không có dữ liệu phiếu thu',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter invoices based on search and category
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        invoice =>
          (invoice.customer?.name && invoice.customer.name.toLowerCase().includes(search)) ||
          (invoice.customer?.tax_code &&
            invoice.customer.tax_code.toLowerCase().includes(search)) ||
          (invoice.remark && invoice.remark.toLowerCase().includes(search)) ||
          (invoice.items &&
            invoice.items.some(
              item =>
                (item.license_plate && item.license_plate.toLowerCase().includes(search)) ||
                (item.item_name && item.item_name.toLowerCase().includes(search))
            ))
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(invoice => invoice.invoice_category_id === selectedCategory);
    }

    return filtered;
  }, [invoices, searchTerm, selectedCategory]);

  // Define table columns
  const tableColumns = useMemo(() => {
    const baseColumns = [
      {
        key: 'created_at',
        label: 'Ngày tạo',
        width: 100,
        sortable: true,
        render: value => formatDate(value),
      },
      {
        key: 'invoice_category_id',
        label: 'Hạng mục',
        width: 120,
        sortable: true,
        render: value => {
          const category = categories.find(cat => cat.id === value);
          return category ? category.name : '-';
        },
      },
      {
        key: 'customer_id',
        label: 'Khách hàng',
        width: 150,
        sortable: true,
        render: (_, row) => {
          return row.customer?.name || '-';
        },
      },
      {
        key: 'total',
        label: 'Tổng tiền',
        width: 120,
        sortable: true,
        render: value => formatCurrency(value),
      },
      {
        key: 'payment_status',
        label: 'Trạng thái',
        width: 130,
        sortable: true,
        render: value => {
          const status = value;
          const label = INVOICE_STATUS_LABELS[status] || status;
          const getStatusColor = () => {
            switch (status) {
              case 'DRAFT':
                return '#6b7280';
              case 'PENDING':
                return '#f59e0b';
              case 'PAID':
                return '#10b981';
              case 'CANCELLED':
                return '#ef4444';
              default:
                return '#6b7280';
            }
          };

          return (
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                border: `1px solid ${getStatusColor()}`,
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                color: getStatusColor(),
                backgroundColor: 'transparent',
                minWidth: '80px',
                textAlign: 'center',
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
        render: value => (
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
          // If user info is embedded in the invoice object
          if (row.created_by_user) {
            return row.created_by_user.name || row.created_by_user.email || '-';
          }
          // Otherwise just show the user ID or fetch separately
          return value || '-';
        },
      },
    ];

    return baseColumns;
  }, [categories]);

  // Render mobile card view
  const renderMobileView = () => {
    if (CardComponent) {
      return (
        <Box>
          {filteredInvoices.map(invoice => (
            <CardComponent
              key={invoice.id}
              invoice={invoice}
              onEdit={onEdit}
              onDelete={onDelete}
              categories={categories}
              isLoading={loading}
            />
          ))}
          {!loading && filteredInvoices.length === 0 && (
            <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
              {searchTerm || selectedCategory ? 'Không tìm thấy phiếu thu phù hợp' : emptyMessage}
            </Typography>
          )}
        </Box>
      );
    }

    // Default mobile card layout
    return (
      <Box>
        {filteredInvoices.map(invoice => (
          <Box
            key={invoice.id}
            sx={{
              p: 2,
              mb: 2,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              backgroundColor: 'background.paper',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 1,
              }}
            >
              <Typography variant="h6" component="h3">
                #{invoice.id}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ViewButton size="small" onClick={() => onView(invoice)} />
                <DeleteButton size="small" onClick={() => onDelete(invoice)} />
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Khách hàng:</strong> {invoice.customer?.name || '-'}
            </Typography>

            {showCategoryColumn && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Loại phiếu thu:</strong>{' '}
                {categories.find(cat => cat.id === invoice.invoice_category_id)?.name || '-'}
              </Typography>
            )}

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Tổng tiền:</strong> {formatCurrency(invoice.total)}
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Trạng thái:</strong>{' '}
              {INVOICE_STATUS_LABELS[invoice.payment_status] || invoice.payment_status}
            </Typography>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Ngày tạo:</strong> {formatDate(invoice.created_at)}
            </Typography>

            {invoice.remark && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Ghi chú:</strong> {invoice.remark}
              </Typography>
            )}
          </Box>
        ))}

        {!loading && filteredInvoices.length === 0 && (
          <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
            {searchTerm || selectedCategory ? 'Không tìm thấy phiếu thu phù hợp' : emptyMessage}
          </Typography>
        )}
      </Box>
    );
  };

  // Render desktop table view
  const renderDesktopView = () => {
    const tableProps = {
      columns: tableColumns,
      data: filteredInvoices,
      loading: loading,
      error: error?.message || (error ? 'Có lỗi xảy ra khi tải dữ liệu' : null),
      emptyMessage:
        searchTerm || selectedCategory ? 'Không tìm thấy phiếu thu phù hợp' : emptyMessage,
      pagination: !!pagination,
      rowKeyField: 'id',
    };

    // Add pagination props if provided
    if (pagination) {
      tableProps.page = pagination.page;
      tableProps.totalCount = pagination.total;
      tableProps.onPageChange = (_, newPage) => {
        if (pagination.onPageChange) {
          pagination.onPageChange(newPage);
        }
      };
      tableProps.onRowsPerPageChange = event => {
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

  return <Box sx={{ width: '100%' }}>{isMobile ? renderMobileView() : renderDesktopView()}</Box>;
};

export default InvoiceList;
