import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
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
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
      <TextField
        fullWidth
        size="medium" // Guideline does not specify size for this search, medium seems fine.
        placeholder="Tìm kiếm theo diễn giải, khách hàng, biển số xe..."
        value={searchTerm}
        onChange={onSearchTermChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            backgroundColor: 'background.paper', // Ensure input stands out if paper has different bg
          },
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            },
          },
        }}
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140, flexGrow: 1 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={filterStatus}
            onChange={onFilterStatusChange}
            label="Trạng thái"
            displayEmpty // Allows the label to be shown when value is empty
          >
            <MenuItem value="">
              <em>Tất cả</em>
            </MenuItem>
            <MenuItem value="Lên lịch">Lên lịch</MenuItem>
            <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
            <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
            <MenuItem value="Hủy">Hủy</MenuItem>
          </Select>
        </FormControl>

        <Chip
          label={`${resultCount} kết quả`}
          size="small"
          variant="outlined"
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            fontWeight: 500, // Make text slightly bolder
          }}
        />
      </Box>
    </Paper>
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
