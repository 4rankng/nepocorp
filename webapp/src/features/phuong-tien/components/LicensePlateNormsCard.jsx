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
import StandardTable from '@/components/StandardTable'; // Assuming StandardTable is in this path
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons'; // Assuming ActionButtons are here

const LicensePlateNormsCard = ({
  licensePlate,
  hangNorms = [],
  voNorms = [],
  isMobile,
  mobileTab, // 'cargo' or 'container'
  onOpenAddDialog,
  onEditClick,
  onDeleteClick,
}) => {
  if (isMobile) {
    const standards = mobileTab === 'cargo' ? hangNorms : voNorms;
    const standardType = mobileTab === 'cargo' ? 'km_hang' : 'km_vo';

    return (
      <Paper elevation={1} sx={{ borderRadius: 2, p: 1.5, mb: 1, width: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {licensePlate}
          </Typography>
          <AddButton
            size="small"
            onClick={() => onOpenAddDialog(licensePlate)}
            sx={{ minWidth: 32, height: 32 }}
          />
        </Box>

        {standards.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Chưa có dữ liệu định mức
          </Typography>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, width: '100%' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600, py: 1, pl: 2, pr: 1 }}>TỪ (KM)</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1, px: 1 }}>ĐẾN (KM)</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 1, px: 1 }}>ĐỊNH MỨC (L/KM)</TableCell>
                  <TableCell sx={{ width: 80, py: 1, pr: 1 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {standards.sort((a, b) => a.fromKm - b.fromKm).map((standard) => (
                  <TableRow
                    key={standard.id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { backgroundColor: 'action.hover' }
                    }}
                  >
                    <TableCell sx={{ py: 1, pl: 2, pr: 1 }}>{standard.fromKm}</TableCell>
                    <TableCell sx={{ py: 1, px: 1 }}>{standard.toKm}</TableCell>
                    <TableCell sx={{ py: 1, px: 1 }}>{standard.standard}</TableCell>
                    <TableCell sx={{ py: 1, pr: 1, textAlign: 'right' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <EditButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick(standard, licensePlate, standardType);
                          }}
                        />
                        <DeleteButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick(standard.id, standardType, standard);
                          }}
                        />
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    );
  }

  // Desktop View
  return (
    <Box sx={{ mb: 3, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mr: 1 }}>
          {licensePlate}
        </Typography>
        <AddButton
          size="small"
          onClick={() => onOpenAddDialog(licensePlate)}
          sx={{ minWidth: 32, height: 32 }}
          title="Thêm định mức mới"
        />
      </Box>
      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Định mức hàng
          </Typography>
          <StandardTable
            columns={[
              { key: 'fromKm', label: 'TỪ (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
              { key: 'toKm', label: 'ĐẾN (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
              { key: 'standard', label: 'ĐỊNH MỨC (L/KM)', numeric: true, render: value => value !== undefined && value !== null ? Number(value).toFixed(2) : '-' },
              { key: 'note', label: 'MÔ TẢ', render: value => value || '' },
            ]}
            data={hangNorms.sort((a, b) => a.fromKm - b.fromKm)}
            renderActions={row => (
              <>
                <EditButton onClick={e => { e.stopPropagation(); onEditClick(row, licensePlate, 'km_hang'); }} />
                <DeleteButton onClick={e => { e.stopPropagation(); onDeleteClick(row.id, 'km_hang', row); }} />
              </>
            )}
            emptyMessage="Chưa có dữ liệu định mức hàng"
            sx={{ width: '100%' }}
          />
        </Box>
        <Box sx={{ width: '100%' }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Định mức vỏ
          </Typography>
          <StandardTable
            columns={[
              { key: 'fromKm', label: 'TỪ (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
              { key: 'toKm', label: 'ĐẾN (KM)', numeric: true, render: value => value !== undefined && value !== null ? value.toLocaleString() : '-' },
              { key: 'standard', label: 'ĐỊNH MỨC (L/KM)', numeric: true, render: value => value !== undefined && value !== null ? Number(value).toFixed(2) : '-' },
              { key: 'note', label: 'MÔ TẢ', render: value => value || '' },
            ]}
            data={voNorms.sort((a, b) => a.fromKm - b.fromKm)}
            renderActions={row => (
              <>
                <EditButton onClick={e => { e.stopPropagation(); onEditClick(row, licensePlate, 'km_vo'); }} />
                <DeleteButton onClick={e => { e.stopPropagation(); onDeleteClick(row.id, 'km_vo', row); }} />
              </>
            )}
            emptyMessage="Chưa có dữ liệu định mức vỏ"
            sx={{ width: '100%' }}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default LicensePlateNormsCard;
