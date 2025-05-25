import React from 'react';
import { Box } from '@mui/material';
import StandardTable from '@shared/components/StandardTable';
import { EditButton, DeleteButton } from '@shared/components/ActionButtons';

const ContainerTypeList = ({
  containerTypes = [],
  loading = false,
  onEdit,
  onDelete,
  emptyMessage = 'Không có dữ liệu loại container',
  error = '',
}) => {
  // Define table columns
  const columns = [
    {
      key: 'type',
      label: 'Loại container',
    },
    {
      key: 'description',
      label: 'Mô tả',
      render: value => value || 'Không có mô tả',
      maxWidth: 400,
      getColor: value => (value ? 'text.primary' : 'text.disabled'),
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
            tooltip="Chỉnh sửa loại container"
          />
          <DeleteButton
            onClick={() => onDelete(record)}
            disabled={loading}
            tooltip="Xóa loại container"
          />
        </Box>
      ),
    },
  ];

  return (
    <StandardTable
      columns={columns}
      data={containerTypes}
      loading={loading}
      emptyMessage={emptyMessage}
      error={error}
    />
  );
};

export default ContainerTypeList;
