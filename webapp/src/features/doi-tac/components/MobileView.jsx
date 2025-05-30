import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Typography,
  CircularProgress,
  Fab,
  Zoom,
} from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import ProfileCard from '@/components/ProfileCard';

const MobileView = ({
  partners = [],
  loading = false,
  onEdit,
  onDelete,
  onAdd,
  emptyMessage = 'Không có dữ liệu đối tác',
  error = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter partners based on search term
  const filteredPartners = useMemo(() => {
    if (!searchTerm.trim()) return partners;
    const term = searchTerm.toLowerCase();
    return partners.filter(
      partner =>
        (partner.ten && partner.ten.toLowerCase().includes(term)) ||
        (partner.dia_chi && partner.dia_chi.toLowerCase().includes(term)) ||
        (partner.ma_so_thue && partner.ma_so_thue.toLowerCase().includes(term)) ||
        (partner.ma_dinh_danh && partner.ma_dinh_danh.toLowerCase().includes(term))
    );
  }, [partners, searchTerm]);

  // Handle search input change
  const handleSearchChange = event => {
    setSearchTerm(event.target.value);
  };

  return (
    <Box sx={{ pb: { xs: 10, sm: 11 } }}>
      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Tìm kiếm theo tên, địa chỉ hoặc mã số thuế..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '6px',
              height: 36,
              minHeight: 36,
              fontSize: '0.95rem',
            },
          }}
        />
      </Box>

      {/* Loading state */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 2 }}>Đang tải dữ liệu...</Typography>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Box color="error.main" py={2}>
          <Typography>{error}</Typography>
        </Box>
      )}

      {/* Content */}
      {!loading && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredPartners.map(partner => (
            <ProfileCard
              key={partner.id}
              item={partner}
              identifier={partner.ma_dinh_danh || '--'}
              name={partner.ten}
              infoLine1={
                <>
                  <strong>Địa chỉ:</strong> {partner.dia_chi || 'Chưa cập nhật'}
                </>
              }
              infoLine2={
                <>
                  <strong>Mã số thuế:</strong> {partner.ma_so_thue || 'Chưa cập nhật'}
                </>
              }
              onEdit={onEdit}
              onDelete={onDelete}
              loading={loading}
            />
          ))}

          {filteredPartners.length === 0 && (
            <Box textAlign="center" py={6}>
              <Typography variant="body1" color="text.secondary">
                {searchTerm ? 'Không tìm thấy đối tác phù hợp' : emptyMessage}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Floating Action Button */}
      <Zoom in={!loading}>
        <Fab
          color="primary"
          aria-label="Thêm đối tác"
          onClick={onAdd}
          sx={{
            position: 'fixed',
            bottom: { xs: 24, sm: 32 },
            right: { xs: 24, sm: 32 },
            zIndex: 1201,
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.25)',
            '&:hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 12px 40px rgba(25, 118, 210, 0.35)',
            },
            transition: 'all 0.2s ease-in-out',
            width: 56,
            height: 56,
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default MobileView;
