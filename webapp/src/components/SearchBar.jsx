import React from 'react';
import { TextField, InputAdornment, Box } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
/**
 * Reusable SearchBar component with consistent styling
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Change handler function
 * @param {string} [props.placeholder] - Placeholder text
 * @param {Object} [props.sx] - Additional styling
 * @param {boolean} [props.fullWidth=true] - Whether to take full width
 * @param {string} [props.size='small'] - Size of the input
 * @param {string} [props.variant='outlined'] - Variant of the TextField
 * @param {React.ReactNode} [props.startAdornment] - Custom start adornment (overrides default search icon)
 * @param {Object} [props.InputProps] - Additional InputProps
 * @param {Object} [props.containerSx] - Styling for the container Box
 */
const SearchBar = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  sx = {},
  fullWidth = true,
  size = 'small',
  variant = 'outlined',
  startAdornment,
  InputProps = {},
  containerSx = {},
  ...props
}) => {
  const defaultStartAdornment = startAdornment || (
    <InputAdornment position="start">
      <SearchIcon />
    </InputAdornment>
  );
  const defaultInputProps = {
    startAdornment: defaultStartAdornment,
    sx: {
      borderRadius: '6px',
      height: 36,
      minHeight: 36,
      fontSize: '0.95rem',
      ...InputProps.sx,
    },
    ...InputProps,
  };
  const defaultSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '6px',
      height: 36,
      minHeight: 36,
    },
    '& .MuiInputBase-input': {
      fontSize: '0.95rem',
    },
    ...sx,
  };
  return (
    <Box sx={containerSx}>
      <TextField
        fullWidth={fullWidth}
        size={size}
        variant={variant}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        InputProps={defaultInputProps}
        sx={defaultSx}
        {...props}
      />
    </Box>
  );
};
export default SearchBar;
