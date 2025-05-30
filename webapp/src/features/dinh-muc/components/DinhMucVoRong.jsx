import React, { useState } from 'react';
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
import DinhMucTheoBienSoXeSection from './DinhMucTheoBienSoXeSection';
import { useVoRong } from '../hooks';

const DinhMucVoRong = () => {
  const muiTheme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentStandard, setCurrentStandard] = useState(null);
  const [deleteDetails, setDeleteDetails] = useState({ id: null, type: null, details: '' });

  const {
    dinhMucVoRong,
    availableLicensePlates,
    isLoading,
    error,
    createVoRongStandard,
    updateVoRongStandard,
    deleteVoRongStandard,
  } = useVoRong();

  // Convert the license plates data to match the expected format
  const activeLicensePlatesWithStandards = availableLicensePlates;

  const openAddNewDinhMucDialog = (params) => {
    setCurrentStandard(null);
    setAddDialogOpen(true);
  };

  const openEditDinhMucDialog = (standard) => {
    setCurrentStandard(standard);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (id, type, details) => {
    setDeleteDetails({ id, type, details });
    setDeleteDialogOpen(true);
  };

  const handleTriggerDeleteDialog = (id, type, item, licensePlate) => {
    let detailsText = '';
    const plateIdText = licensePlate ? `cho BSX ${licensePlate}` : '';
    if (type === 'km_vo') {
      detailsText = `định mức vỏ (Từ ${item.fromKm}km đến ${item.toKm}km) ${plateIdText}`;
    } else {
      detailsText = 'định mức đã chọn'; // Fallback
    }
    openDeleteDialog(id, type, detailsText);
  };

  return (
    <Paper
      sx={{
        p: { xs: 1.5, md: 2 },
        mb: 3,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
      }}
    >
      <Typography
        variant="h6"
        component="h2"
        sx={{ fontWeight: 'bold', mb: 2, fontSize: { xs: '1rem', md: '1.25rem' } }}
      >
        Định mức vỏ rỗng
      </Typography>

      {isLoading ? (
        <Box
          sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 150 }}
        >
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || error.toString()}
        </Alert>
      ) : (
        <Box>
          <Box
            sx={{
              mb: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TextField
              size="small"
              variant="outlined"
              placeholder="Tìm kiếm biển số xe..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <span role="img" aria-label="search">
                      🔍
                    </span>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: '6px',
                  height: 36,
                  minHeight: 36,
                  fontSize: '0.95rem',
                },
              }}
              sx={{
                maxWidth: '100%',
                flexGrow: 1,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '6px',
                  height: 36,
                  fontSize: '0.95rem',
                },
                '& .MuiInputBase-input': { py: 0.5, fontSize: '0.95rem' },
              }}
            />
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() =>
                openAddNewDinhMucDialog({
                  licensePlate: null,
                  loaiDinhMuc: 'km_vo',
                })
              }
              sx={{ height: 36, ml: 2, whiteSpace: 'nowrap' }}
            >
              Thêm mới
            </Button>
          </Box>
          <DinhMucTheoBienSoXeSection
            dinhMucHang={[]} // Empty array since we're only showing km_vo
            dinhMucVo={dinhMucVoRong}
            activeLicensePlatesWithStandards={activeLicensePlatesWithStandards}
            isLoading={isLoading}
            error={error ? error.message || 'Lỗi không xác định' : null}
            searchQuery={searchQuery}
            onOpenAddNewDialog={openAddNewDinhMucDialog}
            onOpenEditDialog={openEditDinhMucDialog}
            onOpenDeleteDialog={handleTriggerDeleteDialog}
            normTypeFilter="km_vo" // Only show km_vo standards
          />
        </Box>
      )}
    </Paper>
  );
};

export default DinhMucVoRong;
