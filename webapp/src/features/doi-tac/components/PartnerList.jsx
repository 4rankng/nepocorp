import React from 'react';
import { Box } from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { EditButton, DeleteButton } from '@/components/ActionButtons';
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
      field: 'ma_dinh_danh', // key -> field
      headerName: 'Mã đối tác', // label -> headerName
      width: 150, // Default width
    },
    {
      field: 'ten', // key -> field
      headerName: 'Tên đối tác', // label -> headerName
      width: 200, // Default width
    },
    {
      field: 'dia_chi', // key -> field
      headerName: 'Địa chỉ', // label -> headerName
      renderCell: params => params.value || 'Chưa cập nhật', // render -> renderCell
      width: 300, // maxWidth replaced by width
    },
    {
      field: 'ma_so_thue', // key -> field
      headerName: 'Mã số thuế', // label -> headerName
      renderCell: params => params.value || 'Chưa cập nhật', // render -> renderCell
      width: 150, // Default width
    },
    {
      field: 'actions', // key -> field
      headerName: 'Thao tác', // label -> headerName
      align: 'right',
      headerAlign: 'right',
      sortable: false,
      renderCell: (params) => ( // render -> renderCell, adapt signature
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton
            onClick={() => onEdit(params.row)}
            disabled={loading}
            tooltip="Chỉnh sửa đối tác"
          />
          <DeleteButton onClick={() => onDelete(params.row)} disabled={loading} tooltip="Xóa đối tác" />
        </Box>
      ),
    },
  ];
  return (
    <StandardTable
      columns={columns}
      rows={partners} // data -> rows
      loading={loading}
      emptyMessage={emptyMessage}
      error={error}
    />
  );
};
export default PartnerList;
