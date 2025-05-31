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
      field: 'ma_dinh_danh', // key -> field
      headerName: 'Mã khách hàng', // label -> headerName
      sortable: true,
      headerAlign: 'left',
      align: 'left',
      flex: 0.75,
    },
    {
      field: 'ten', // key -> field
      headerName: 'Tên khách hàng', // label -> headerName
      sortable: true,
      headerAlign: 'left',
      align: 'left',
      flex: 1.5,
    },
    {
      field: 'dia_chi', // key -> field
      headerName: 'Địa chỉ', // label -> headerName
      sortable: true,
      renderCell: params => params.value || 'Chưa cập nhật', // render -> renderCell
      width: 300, // maxWidth -> width
      headerAlign: 'left',
      align: 'left',
    },
    {
      field: 'ma_so_thue', // key -> field
      headerName: 'Mã số thuế', // label -> headerName
      sortable: true,
      renderCell: params => params.value || 'Chưa cập nhật', // render -> renderCell
      headerAlign: 'left',
      align: 'left',
      flex: 0.75,
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
      rows={customers} // data -> rows
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
