import React from 'react';
import { 
  Chip,
  IconButton,
  Tooltip,
  Box
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import StandardTable from '@/components/StandardTable';
import { 
  FINANCIAL_LEDGER_COLUMNS, 
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_COLORS 
} from '../constants';

const StatementTable = ({ 
  transactions = [],
  loading = false,
  error = null,
  pagination = {},
  onView = () => {},
  onEdit = () => {},
  onDelete = () => {},
  showActions = true
}) => {
  // Enhanced columns with custom rendering
  const enhancedColumns = [
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
                fontWeight: 500
              }}
            />
          );
        }
        
        // Use original render function if available
        if (col.render) {
          return col.render(value, row);
        }
        
        return value;
      }
    })),
    // Actions column
    ...(showActions ? [{
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
      )
    }] : [])
  ];

  return (
    <StandardTable
      columns={enhancedColumns}
      data={transactions}
      loading={loading}
      error={error}
      emptyMessage="Chưa có giao dịch nào"
      pagination={true}
      page={pagination.page || 0}
      totalCount={pagination.total || 0}
      onPageChange={pagination.onPageChange}
      onRowsPerPageChange={pagination.onRowsPerPageChange}
      customRowsPerPageOptions={[25, 50, 100]}
      rowKeyField="id"
      sortable={true}
      defaultSort={{ key: 'transaction_date', direction: 'desc' }}
      showSTT={true}
      minHeight="400px"
      sx={{
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
        }
      }}
    />
  );
};

export default StatementTable;