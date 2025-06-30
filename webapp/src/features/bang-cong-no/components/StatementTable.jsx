import React from 'react';
import { Chip, IconButton, Tooltip, Box } from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import StandardTable from '@/components/StandardTable';
import {
  FINANCIAL_LEDGER_COLUMNS,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS,
} from '../constants';

const StatementTable = ({
  transactions = [],
  loading = false,
  error = null,
  pagination = {},
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
  showActions = true,
  variant = 'default',
}) => {
  // HTML demo columns configuration - matching the HTML table structure
  const getColumnsConfig = () => {
    if (variant === 'html-demo') {
      return [
        {
          id: 'customer_name',
          label: 'Tên đơn vị',
          sortable: true,
          width: '200px',
          render: (value, row) => {
            const customerName = row.Customer?.name || row.customer_name || 'Mộc Sương';
            return (
              <span
                style={{
                  color: '#3182ce',
                  textDecoration: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {customerName}
              </span>
            );
          },
        },
        {
          id: 'balance',
          label: 'Phải thu',
          sortable: true,
          width: '150px',
          align: 'right',
          render: (value, row) => {
            // Mock data from HTML demo
            const amount = row.debit || 0;
            const isPositive = amount > 0;
            const isZero = amount === 0;

            const color = isZero ? '#718096' : isPositive ? '#e53e3e' : '#48bb78';

            return (
              <span
                style={{
                  color,
                  fontFamily: 'SF Mono, Monaco, monospace',
                  fontWeight: 500,
                }}
              >
                {isZero
                  ? '0 đ'
                  : new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      minimumFractionDigits: 0,
                    }).format(amount)}
              </span>
            );
          },
        },
        {
          id: 'notes',
          label: 'Ghi chú',
          sortable: true,
          width: '150px',
          render: (value, row) => {
            // Mock badge data from HTML demo
            const amount = row.debit || 0;
            if (amount > 70000000) {
              return (
                <Chip
                  label="Nợ T1,2,3,4"
                  size="small"
                  sx={{
                    bgcolor: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                />
              );
            } else if (amount > 25000000) {
              return (
                <Chip
                  label="Nợ T3,4"
                  size="small"
                  sx={{
                    bgcolor: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                />
              );
            } else if (amount > 0) {
              return (
                <Chip
                  label="Nợ T4"
                  size="small"
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                />
              );
            }
            return '-';
          },
        },
        // Actions column
        ...(showActions
          ? [
              {
                id: 'actions',
                label: 'Thao tác',
                sortable: false,
                width: '100px',
                align: 'center',
                render: (value, row) => (
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                    <Tooltip title="Xem chi tiết">
                      <IconButton
                        size="small"
                        onClick={() => onView(row)}
                        sx={{
                          color: '#718096',
                          bgcolor: '#f7fafc',
                          border: '1px solid #e2e8f0',
                          width: 32,
                          height: 32,
                          '&:hover': {
                            bgcolor: '#edf2f7',
                          },
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ),
              },
            ]
          : []),
      ];
    }

    // Default columns for other variants
    return [
      ...FINANCIAL_LEDGER_COLUMNS.map(col => ({
        ...col,
        render: (value, row) => {
          // Custom rendering for transaction type with color chips
          if (col.id === 'transaction_type') {
            const typeColor = TRANSACTION_TYPE_COLORS[value] || '#616161';
            return (
              <Chip
                label={TRANSACTION_TYPE_LABELS[value] || value}
                size="small"
                sx={{
                  bgcolor: `${typeColor}15`,
                  color: typeColor,
                  border: `1px solid ${typeColor}30`,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              />
            );
          }

          // Use original render function if available
          if (col.render) {
            return col.render(value, row);
          }

          return value;
        },
      })),
      // Actions column
      ...(showActions
        ? [
            {
              id: 'actions',
              label: 'Thao tác',
              sortable: false,
              width: '120px',
              align: 'center',
              render: (value, row) => (
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Xem chi tiết">
                    <IconButton
                      size="small"
                      onClick={() => onView(row)}
                      sx={{ color: 'primary.main' }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Chỉnh sửa">
                    <IconButton
                      size="small"
                      onClick={() => onEdit(row)}
                      sx={{ color: 'warning.main' }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Xóa">
                    <IconButton
                      size="small"
                      onClick={() => onDelete(row)}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              ),
            },
          ]
        : []),
    ];
  };

  const enhancedColumns = getColumnsConfig();

  // Generate mock data for HTML demo
  const getMockData = () => {
    if (variant === 'html-demo') {
      return [
        { id: 1, customer_name: 'Mộc Sương', debit: 0, notes: '-' },
        { id: 2, customer_name: 'Ligarden', debit: 0, notes: '-' },
        { id: 3, customer_name: 'Tân Lập MC', debit: 27330030, notes: 'Nợ T4' },
        { id: 4, customer_name: 'Vista', debit: 25988000, notes: 'Nợ T4' },
        { id: 5, customer_name: 'Vinatea MC', debit: 76640050, notes: 'Nợ T3,4' },
        { id: 6, customer_name: 'Trà Thu Đan', debit: 240291120, notes: 'Nợ T1,2,3,4' },
      ];
    }
    return transactions;
  };

  const tableData = getMockData();

  // Custom styling for HTML demo variant
  const getTableStyles = () => {
    if (variant === 'html-demo') {
      return {
        '& .MuiTableCell-root': {
          padding: '14px 16px',
          fontSize: '0.875rem',
        },
        '& .MuiTableHead-root': {
          backgroundColor: '#f7fafc',
        },
        '& .MuiTableHead-root .MuiTableCell-root': {
          fontWeight: 600,
          color: '#4a5568',
          borderBottom: '1px solid #e2e8f0',
          whiteSpace: 'nowrap',
        },
        '& .MuiTableBody-root .MuiTableRow-root': {
          '&:hover': {
            backgroundColor: '#f7fafc',
          },
        },
        '& .MuiTableBody-root .MuiTableCell-root': {
          borderBottom: '1px solid #f0f0f0',
        },
        '& .MuiTableFooter-root': {
          backgroundColor: '#f0f0f0',
          fontWeight: 600,
        },
        '& .MuiTableFooter-root .MuiTableCell-root': {
          borderBottom: 'none',
          padding: '16px',
          fontWeight: 600,
        },
      };
    }

    return {
      '& .MuiTableCell-root': {
        padding: '12px 16px',
      },
      '& .MuiTableHead-root': {
        backgroundColor: '#f5f7fa',
      },
      '& .MuiTableHead-root .MuiTableCell-root': {
        fontWeight: 600,
        color: '#374151',
        borderBottom: '2px solid #e5e7eb',
      },
      '& .MuiTableBody-root .MuiTableRow-root': {
        '&:hover': {
          backgroundColor: '#f9fafb',
        },
      },
      '& .MuiTableBody-root .MuiTableCell-root': {
        borderBottom: '1px solid #f3f4f6',
      },
    };
  };

  return (
    <StandardTable
      columns={enhancedColumns}
      data={tableData}
      loading={loading}
      error={error}
      emptyMessage="Chưa có giao dịch nào"
      pagination={variant !== 'html-demo'}
      page={pagination.page || 0}
      totalCount={pagination.total || 0}
      onPageChange={pagination.onPageChange}
      onRowsPerPageChange={pagination.onRowsPerPageChange}
      customRowsPerPageOptions={[25, 50, 100]}
      rowKeyField="id"
      sortable={true}
      defaultSort={{
        key: variant === 'html-demo' ? 'customer_name' : 'transaction_date',
        direction: 'desc',
      }}
      showSTT={true}
      minHeight="400px"
      sx={getTableStyles()}
      footer={
        variant === 'html-demo'
          ? {
              content: [
                { colSpan: 2, content: 'TỔNG CỘNG', align: 'left' },
                {
                  colSpan: 1,
                  content: (
                    <span
                      style={{
                        color: '#e53e3e',
                        fontFamily: 'SF Mono, Monaco, monospace',
                        fontWeight: 500,
                      }}
                    >
                      723,975,720 đ
                    </span>
                  ),
                  align: 'right',
                },
                { colSpan: 2, content: '', align: 'left' },
              ],
            }
          : undefined
      }
    />
  );
};

export default StatementTable;
