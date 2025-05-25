import React from 'react';
import { Box } from '@mui/material';
import StandardTable from '@shared/components/StandardTable';
import { EditButton, DeleteButton } from '@shared/components/ActionButtons';

const PartnerList = ({
  partners = [],
  loading = false,
  onEdit,
  onDelete,
  emptyMessage = 'Không có dữ liệu đối tác',
  error = '',
}) => {
  // Define table columns
  const columns = [
    {
      key: 'name',
      label: 'Tên đối tác',
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
            tooltip="Chỉnh sửa đối tác"
          />
          <DeleteButton onClick={() => onDelete(record)} disabled={loading} tooltip="Xóa đối tác" />
        </Box>
      ),
    },
  ];

  return (
    <StandardTable
      columns={columns}
      data={partners}
      loading={loading}
      emptyMessage={emptyMessage}
      error={error}
    />
  );
};

export default PartnerList;
