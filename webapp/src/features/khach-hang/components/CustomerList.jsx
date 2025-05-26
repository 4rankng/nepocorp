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
  // Define table columns
  const columns = [
    {
      key: 'name',
      label: 'Tên khách hàng',
    },
    {
      key: 'address',
      label: 'Địa chỉ',
      render: value => value || 'Chưa cập nhật',
      maxWidth: 300,
    },
    {
      key: 'taxCode',
      label: 'Mã số thuế',
      render: value => value || 'Chưa cập nhật',
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton
            onClick={() => onEdit(record)}
            disabled={loading}
            tooltip="Chỉnh sửa khách hàng"
          />
          <DeleteButton
            onClick={() => onDelete(record)}
            disabled={loading}
            tooltip="Xóa khách hàng"
          />
        </Box>
      ),
    },
  ];

  return (
    <StandardTable
      columns={columns}
      data={customers}
      loading={loading}
      emptyMessage={emptyMessage}
      error={error}
    />
  );
};

export default CustomerList;
