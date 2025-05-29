import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
const MobileSearchHeader = ({
  searchTerm,
  onSearchTermChange,
  filterStatus,
  onFilterStatusChange,
  resultCount,
}) => {
  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <TextField
        fullWidth
        size="medium"
        placeholder="Tìm kiếm theo diễn giải, khách hàng, biển số xe..."
        value={searchTerm}
        onChange={onSearchTermChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#6b7280' }} />
            </InputAdornment>
          ),
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            height: '48px',
            fontSize: '16px',
            backgroundColor: 'white',
            borderRadius: '8px',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#d1d5db',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1976d2',
              borderWidth: '1px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#e5e7eb',
            },
          },
        }}
      />
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140, flexGrow: 1 }}>
          <InputLabel
            id="status-filter-label"
            shrink={true}
            sx={{
              color: '#6b7280',
              '&.Mui-focused': {
                color: '#1976d2',
              },
            }}
          >
            Trạng thái
          </InputLabel>
          <Select
            labelId="status-filter-label"
            value={filterStatus}
            onChange={onFilterStatusChange}
            label="Trạng thái"
            displayEmpty
            notched={true}
            sx={{
              backgroundColor: 'white',
              borderRadius: '6px',
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                color: '#374151',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e5e7eb',
                legend: {
                  span: {
                    px: 1,
                  },
                },
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#d1d5db',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
            }}
          >
            <MenuItem value="" sx={{ color: '#6b7280', fontStyle: 'italic' }}>
              Tất cả
            </MenuItem>
            <MenuItem value="Lên lịch" sx={{ color: '#374151' }}>
              Lên lịch
            </MenuItem>
            <MenuItem value="Đang vận chuyển" sx={{ color: '#374151' }}>
              Đang vận chuyển
            </MenuItem>
            <MenuItem value="Hoàn thành" sx={{ color: '#374151' }}>
              Hoàn thành
            </MenuItem>
            <MenuItem value="Hủy" sx={{ color: '#374151' }}>
              Hủy
            </MenuItem>
          </Select>
        </FormControl>
        <Chip
          label={`${resultCount} kết quả`}
          size="small"
          sx={{
            backgroundColor: '#e5e7eb',
            color: '#374151',
            fontWeight: 500,
            border: 'none',
            fontSize: '12px',
          }}
        />
      </Box>
    </Box>
  );
};
MobileSearchHeader.propTypes = {
  searchTerm: PropTypes.string.isRequired,
  onSearchTermChange: PropTypes.func.isRequired,
  filterStatus: PropTypes.string.isRequired,
  onFilterStatusChange: PropTypes.func.isRequired,
  resultCount: PropTypes.number.isRequired,
};
export default MobileSearchHeader;
