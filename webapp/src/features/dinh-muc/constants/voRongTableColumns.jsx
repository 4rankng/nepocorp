import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { EditButton, DeleteButton } from '@/components/ActionButtons';

export const getVoRongTableColumns = (onEdit, onDelete, page, pageSize) => [
  {
    id: 'bienSoXe',
    label: 'Biển số',
    render: (value, record) => record.bienSoXe,
    width: '15%',
  },
  {
    id: 'tuKm',
    label: 'Từ Km',
    render: (value, record) => record.tuKm,
    width: '10%',
    align: 'right',
  },
  {
    id: 'denKm',
    label: 'Đến Km',
    render: (value, record) => record.denKm,
    width: '10%',
    align: 'right',
  },
  {
    id: 'l_km',
    label: 'Định mức (L/km)',
    render: (value, record) => record.l_km,
    width: '15%',
    align: 'right',
  },
  {
    id: 'ghiChu',
    label: 'Ghi chú',
    render: (value, record) => record.ghiChu || '-',
    width: '25%',
  },
  {
    id: 'actions',
    label: 'Thao tác',
    render: (value, record) => (
      <>
        <EditButton onClick={() => onEdit(record)} sx={{ mr: 1 }} />
        <DeleteButton onClick={() => onDelete(record)} />
      </>
    ),
    width: '15%',
    align: 'center',
  },
];
