import React from 'react';
import { Box } from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

const CustomerList = ({
  customers = [],
  loading = false,
  onEdit,
  onDelete,
  emptyMessage = 'Không có dữ liệu khách hàng',
  error = '',
}) => {
  // Define table columns with enhanced features
  const columns = [
    {
      key: 'ma_dinh_danh',
      label: 'Mã khách hàng',
      sortable: true,
    },
    {
      key: 'ten',
      label: 'Tên khách hàng',
      sortable: true,
    },
    {
      key: 'dia_chi',
      label: 'Địa chỉ',
      sortable: true,
      render: value => value || 'Chưa cập nhật',
      maxWidth: 300,
    },
    {
      key: 'ma_so_thue',
      label: 'Mã số thuế',
      sortable: true,
      render: value => value || 'Chưa cập nhật',
    },
  ];

  // Render action buttons for each row
  const renderActions = record => (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
      <EditButton
        onClick={() => onEdit(record)}
        disabled={loading}
        tooltip="Chỉnh sửa khách hàng"
      />
      <DeleteButton onClick={() => onDelete(record)} disabled={loading} tooltip="Xóa khách hàng" />
    </Box>
  );

  return (
    <StandardTable
      columns={columns}
      data={customers}
      renderActions={renderActions}
      loading={loading}
      emptyMessage={emptyMessage}
      error={error}
      sortable={true}
      defaultSort={{ key: 'ten', direction: 'asc' }}
    />
  );
};

export default CustomerList;
