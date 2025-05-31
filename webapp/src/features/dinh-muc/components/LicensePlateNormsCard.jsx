import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import StandardTable from '@/components/StandardTable';
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons';
const LicensePlateNormsCard = ({
  licensePlate,
  standardsHang = [],
  standardsVo = [],
  onAdd,
  onEdit,
  onDelete,
  normTypeFilter, // 'km_hang' or 'km_vo' to filter by norm type
}) => {
  // Desktop View
  return (
    <Box sx={{ mb: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
          {licensePlate}
        </Typography>
        <AddButton
          size="small"
          onClick={() => onAdd(normTypeFilter || 'km_hang')}
          sx={{ minWidth: 32, height: 32 }}
          title="Thêm định mức mới"
        />
      </Box>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(!normTypeFilter || normTypeFilter === 'km_hang') && (
          <Box sx={{ width: '100%' }}>
            <StandardTable
              columns={[
                {
                  field: 'fromKm', // key -> field
                  headerName: 'TỪ (KM)', // label -> headerName
                  numeric: true, // StandardTable will handle type and alignment
                  renderCell: params => // render -> renderCell
                    params.value !== undefined && params.value !== null ? params.value.toLocaleString() : '-',
                },
                {
                  field: 'toKm', // key -> field
                  headerName: 'ĐẾN (KM)', // label -> headerName
                  numeric: true,
                  renderCell: params => // render -> renderCell
                    params.value !== undefined && params.value !== null ? params.value.toLocaleString() : '-',
                },
                {
                  field: 'standard', // key -> field
                  headerName: 'ĐỊNH MỨC (L/KM)', // label -> headerName
                  numeric: true,
                  renderCell: params => // render -> renderCell
                    params.value !== undefined && params.value !== null ? Number(params.value).toFixed(2) : '-',
                },
                { field: 'note', headerName: 'MÔ TẢ', renderCell: params => params.value || '' }, // key -> field, label -> headerName, render -> renderCell
              ]}
              rows={standardsHang.sort((a, b) => a.fromKm - b.fromKm)} // data -> rows
              renderActions={row => (
                <>
                  <EditButton
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(row, 'km_hang');
                    }}
                  />
                  <DeleteButton
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(row, 'km_hang');
                    }}
                  />
                </>
              )}
              emptyMessage="Chưa có dữ liệu định mức hàng"
              sx={{ width: '100%' }}
            />
          </Box>
        )}
        {(!normTypeFilter || normTypeFilter === 'km_vo') && (
          <Box sx={{ width: '100%' }}>
            <StandardTable
              columns={[
                {
                  field: 'fromKm', // key -> field
                  headerName: 'TỪ (KM)', // label -> headerName
                  numeric: true,
                  renderCell: params => // render -> renderCell
                    params.value !== undefined && params.value !== null ? params.value.toLocaleString() : '-',
                },
                {
                  field: 'toKm', // key -> field
                  headerName: 'ĐẾN (KM)', // label -> headerName
                  numeric: true,
                  renderCell: params => // render -> renderCell
                    params.value !== undefined && params.value !== null ? params.value.toLocaleString() : '-',
                },
                {
                  field: 'standard', // key -> field
                  headerName: 'ĐỊNH MỨC (L/KM)', // label -> headerName
                  numeric: true,
                  renderCell: params => // render -> renderCell
                    params.value !== undefined && params.value !== null ? Number(params.value).toFixed(2) : '-',
                },
                { field: 'note', headerName: 'MÔ TẢ', renderCell: params => params.value || '' }, // key -> field, label -> headerName, render -> renderCell
              ]}
              rows={standardsVo.sort((a, b) => a.fromKm - b.fromKm)} // data -> rows
              renderActions={row => (
                <>
                  <EditButton
                    onClick={e => {
                      e.stopPropagation();
                      onEdit(row, 'km_vo');
                    }}
                  />
                  <DeleteButton
                    onClick={e => {
                      e.stopPropagation();
                      onDelete(row, 'km_vo');
                    }}
                  />
                </>
              )}
              emptyMessage="Chưa có dữ liệu định mức vỏ"
              sx={{ width: '100%' }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};
export default LicensePlateNormsCard;
