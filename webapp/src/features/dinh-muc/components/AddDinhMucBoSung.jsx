import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  CircularProgress,
  Box,
  Grid,
  Autocomplete,
  Typography,
  Tooltip,
  IconButton,
  Paper,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import logger from '@services/logger';
import TuyenDuongManager from './TuyenDuongManager';

/**
 * A dialog component for adding/editing dinh muc bo sung records
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onClose - Callback when dialog is closed
 * @param {Object} props.formData - Form data object
 * @param {Function} props.setFormData - Function to update form data
 * @param {Object} props.formErrors - Form validation errors
 * @param {boolean} props.isSubmitting - Whether the form is being submitted
 * @param {Array} props.dauKeoList - List of dau keo for the bien so dropdown
 * @param {Array} props.tuyenDuongList - List of tuyen duong for the ma tuyen dropdown
 * @param {Function} props.onSubmit - Callback when form is submitted
 * @returns {JSX.Element} The rendered component
 */
const AddDinhMucBoSung = ({
  open,
  onClose,
  formData,
  setFormData,
  formErrors,
  isSubmitting,
  dauKeoList = [],
  tuyenDuongList = [],
  onSubmit,
}) => {
  const [tuyenDuongManagerOpen, setTuyenDuongManagerOpen] = useState(false);
  const [selectedTuyenDuong, setSelectedTuyenDuong] = useState(null);
  const [isSubmittingTuyenDuong, setIsSubmittingTuyenDuong] = useState(false);

  // Process tuyen duong list for the dropdown
  const processedTuyenDuongList = useMemo(() => {
    try {
      // Add 'Tất cả' option first
      const allOption = {
        ma_so: '',
        diem_di: '*',
        diem_den: '*',
        label: 'Tất cả',
      };

      // Map the rest of the tuyen duong items
      const tuyenItems = tuyenDuongList.map(tuyen => ({
        ...tuyen,
        label: `${tuyen.diem_di} - ${tuyen.diem_den}`,
      }));

      return [allOption, ...tuyenItems];
    } catch (error) {
      logger.error('Error processing tuyen duong list:', error);
      return [];
    }
  }, [tuyenDuongList]);

  // Process dau keo list for the dropdown
  const processedDauKeoList = useMemo(() => {
    try {
      // Add 'Tất cả' option first
      const allOption = {
        value: '',
        label: 'Tất cả',
        isAll: true
      };

      // Map the dau keo items
      const items = dauKeoList.map(item => ({
        value: typeof item === 'object' ? item.bien_so : item,
        label: typeof item === 'object' ? item.bien_so : item,
        isAll: false
      }));

      return [allOption, ...items];
    } catch (error) {
      logger.error('Error processing dau keo list:', error);
      return [];
    }
  }, [dauKeoList]);

  // Get selected dau keo
  const selectedDauKeo = useMemo(() => {
    if (formData.bien_so === null || formData.bien_so === '') {
      return processedDauKeoList.find(item => item.isAll) || null;
    }
    return processedDauKeoList.find(item => item.value === formData.bien_so) || null;
  }, [formData.bien_so, processedDauKeoList]);

  // Handle dau keo change
  const handleDauKeoChange = (_, newValue) => {
    setFormData(prev => ({
      ...prev,
      bien_so: newValue?.value || null,
    }));
  };

  // Initialize selected tuyen duong when form data changes
  React.useEffect(() => {
    if (formData.ma_tuyen) {
      const tuyen = tuyenDuongList.find(t => t.ma_so === formData.ma_tuyen);
      if (tuyen) {
        setSelectedTuyenDuong({
          ...tuyen,
          label: `${tuyen.diem_di} - ${tuyen.diem_den}`,
        });
      }
    } else {
      setSelectedTuyenDuong(null);
    }
  }, [formData.ma_tuyen, tuyenDuongList]);

  const handleTuyenDuongChange = (_, newValue) => {
    setSelectedTuyenDuong(newValue);
    setFormData(prev => ({
      ...prev,
      ma_tuyen: newValue ? newValue.ma_so : null,
    }));
  };

  const handleOpenTuyenDuongManager = () => {
    setTuyenDuongManagerOpen(true);
  };

  const handleCloseTuyenDuongManager = () => {
    setTuyenDuongManagerOpen(false);
  };

  const handleSaveTuyenDuong = async (newTuyenDuong) => {
    setIsSubmittingTuyenDuong(true);
    try {
      // In a real app, you would call an API to save the new tuyen duong
      // For now, we'll just update the local state
      const newTuyen = {
        ...newTuyenDuong,
        ma_so: `td-${Date.now()}`,
        diem_di: newTuyenDuong.diem_di.trim(),
        diem_den: newTuyenDuong.diem_den.trim(),
      };

      // Update the selected tuyen duong
      const updatedTuyen = {
        ...newTuyen,
        label: `${newTuyen.diem_di} - ${newTuyen.diem_den}`,
      };

      setSelectedTuyenDuong(updatedTuyen);
      setFormData(prev => ({
        ...prev,
        ma_tuyen: updatedTuyen.ma_so,
      }));

      // In a real app, you would update the tuyenDuongList here
      // by calling the parent component's update function

      setTuyenDuongManagerOpen(false);
    } catch (error) {
      logger.error('Error saving tuyen duong:', error);
    } finally {
      setIsSubmittingTuyenDuong(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Thêm định mức bổ sung</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            {/* Biển số */}
            <Box sx={{ width: '50%' }}>
              <Autocomplete
                value={selectedDauKeo}
                onChange={handleDauKeoChange}
                options={processedDauKeoList}
                getOptionLabel={(option) => option?.label || ''}
                isOptionEqualToValue={(option, value) => option?.value === value?.value}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Biển số"
                    variant="outlined"
                    error={!!formErrors.bien_so}
                    helperText={formErrors.bien_so}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.875rem',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                )}
                fullWidth
                size="small"
                sx={{
                  '& .MuiAutocomplete-inputRoot': {
                    padding: '6px 12px',
                    height: '40px',
                  },
                }}
              />
            </Box>

            {/* Định mức */}
            <Box sx={{ width: '50%' }}>
              <TextField
                fullWidth
                size="small"
                label="Định mức (lít)"
                type="number"
                value={formData.dinh_muc_l || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    dinh_muc_l: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
                error={!!formErrors.dinh_muc_l}
                helperText={formErrors.dinh_muc_l}
                InputProps={{
                  endAdornment: <InputAdornment position="end">lít</InputAdornment>,
                  sx: {
                    height: '40px',
                    '& input': {
                      height: '100%',
                      padding: '8.5px 14px',
                    },
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.875rem',
                    height: '40px',
                    '& input': {
                      height: '100%',
                      padding: '8.5px 14px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: '0.875rem',
                  },
                }}
              />
            </Box>
          </Box>

          {/* Tuyến đường */}
          <Box sx={{ width: '100%', mb: 0, mt: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <Autocomplete
                value={selectedTuyenDuong}
                onChange={handleTuyenDuongChange}
                options={processedTuyenDuongList}
                getOptionLabel={(option) => option?.label || ''}
                isOptionEqualToValue={(option, value) => option?.ma_so === value?.ma_so}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tuyến đường"
                    variant="outlined"
                    error={!!formErrors.ma_tuyen}
                    helperText={formErrors.ma_tuyen || 'Chọn tuyến đường hoặc tạo mới'}
                    fullWidth
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '0.875rem',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                )}
                fullWidth
                size="small"
                sx={{
                  width: '100%',
                  '& .MuiAutocomplete-inputRoot': {
                    padding: '6px 12px',
                    height: '40px',
                  },
                }}
              />
              <Tooltip title="Thêm tuyến đường mới">
                <Button
                  variant="outlined"
                  onClick={handleOpenTuyenDuongManager}
                  sx={{
                    minWidth: '40px',
                    width: '40px',
                    height: '40px',
                    p: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '& .MuiButton-startIcon': {
                      m: 0
                    }
                  }}
                >
                  <AddIcon fontSize="small" />
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Hủy
        </Button>
        <Button onClick={onSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={24} /> : 'Thêm'}
        </Button>
      </DialogActions>

      {/* Tuyen Duong Manager Dialog */}
      <TuyenDuongManager
        open={tuyenDuongManagerOpen}
        onClose={handleCloseTuyenDuongManager}
        onSave={handleSaveTuyenDuong}
        tuyenDuongList={tuyenDuongList}
        initialData={null}
        isSubmitting={isSubmittingTuyenDuong}
      />
    </Dialog>
  );
};

export default AddDinhMucBoSung;
