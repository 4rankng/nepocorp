import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  Alert,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import LicensePlateNormsCard from './LicensePlateNormsCard';

const DinhMucTheoBienSoXeSection = ({
  dinhMucHang,
  dinhMucVo,
  activeLicensePlatesWithStandards,
  isLoading,
  error,
  searchQuery,
  onSearchQueryChange,
  onOpenAddNewDialog,
  onOpenEditDialog,
  onOpenDeleteDialog,
  normTypeFilter, // 'km_hang' or 'km_vo' to filter by norm type
}) => {
  const muiTheme = useTheme();

  // Filter plates based on search query
  const filteredPlates = React.useMemo(() => {
    if (!searchQuery) {
      return activeLicensePlatesWithStandards;
    }
    return activeLicensePlatesWithStandards.filter(item =>
      item.licensePlate.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activeLicensePlatesWithStandards, searchQuery]);

  return (
    <Box>
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {!isLoading && !error && filteredPlates.length === 0 && (
        <Typography sx={{ textAlign: 'center', color: 'text.secondary', my: 2 }}>
          {searchQuery
            ? 'Không tìm thấy biển số xe phù hợp.'
            : 'Chưa có định mức nào được thêm cho biển số xe.'}
        </Typography>
      )}
      {!isLoading &&
        !error &&
        filteredPlates.map((plateData, index) => (
          <LicensePlateNormsCard
            key={plateData.licensePlate || index}
            licensePlate={plateData.licensePlate}
            standardsHang={
              normTypeFilter === 'km_hang' ? dinhMucHang[plateData.licensePlate] || [] : []
            }
            standardsVo={normTypeFilter === 'km_vo' ? dinhMucVo[plateData.licensePlate] || [] : []}
            onAdd={loaiDinhMuc =>
              onOpenAddNewDialog({ licensePlate: plateData.licensePlate, loaiDinhMuc })
            }
            onEdit={(standard, loaiDinhMuc) =>
              onOpenEditDialog({ standard, licensePlate: plateData.licensePlate, loaiDinhMuc })
            }
            onDelete={(standard, loaiDinhMuc) => {
              // Construct details for the delete dialog
              const itemDetails = `Từ ${standard.fromKm}km đến ${standard.toKm}km (${standard.standard} l/1km)`;
              onOpenDeleteDialog(standard.id, loaiDinhMuc, itemDetails, plateData.licensePlate);
            }}
            normTypeFilter={normTypeFilter}
          />
        ))}
    </Box>
  );
};

export default DinhMucTheoBienSoXeSection;
