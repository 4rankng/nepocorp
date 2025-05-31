import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

export const getVoRongTableColumns = (onEdit, onDelete, page, pageSize) => [
  {
    field: 'bienSoXe', // id -> field
    headerName: 'Biển số', // label -> headerName
    renderCell: (params) => params.row.bienSoXe, // render -> renderCell
    width: 150, // '15%' -> numeric
  },
  {
    field: 'tuKm', // id -> field
    headerName: 'Từ Km', // label -> headerName
    renderCell: (params) => params.row.tuKm, // render -> renderCell
    width: 100, // '10%' -> numeric
    align: 'right',
    headerAlign: 'right',
  },
  {
    field: 'denKm', // id -> field
    headerName: 'Đến Km', // label -> headerName
    renderCell: (params) => params.row.denKm, // render -> renderCell
    width: 100, // '10%' -> numeric
    align: 'right',
    headerAlign: 'right',
  },
  {
    field: 'l_km', // id -> field
    headerName: 'Định mức (L/km)', // label -> headerName
    renderCell: (params) => params.row.l_km, // render -> renderCell
    width: 150, // '15%' -> numeric
    align: 'right',
    headerAlign: 'right',
  },
  {
    field: 'ghiChu', // id -> field
    headerName: 'Ghi chú', // label -> headerName
    renderCell: (params) => params.row.ghiChu || '-', // render -> renderCell
    width: 250, // '25%' -> numeric
  },
  {
    field: 'actions', // id -> field
    headerName: 'Thao tác', // label -> headerName
    renderCell: (params) => ( // render -> renderCell
      <>
        <EditButton onClick={() => onEdit(params.row)} sx={{ mr: 1 }} />
        <DeleteButton onClick={() => onDelete(params.row)} />
      </>
    ),
    width: 150, // '15%' -> numeric
    align: 'center',
    headerAlign: 'center',
    sortable: false,
  },
];
