import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
  Paper,
  useTheme,
  Stack,
  FormControl,
  FormHelperText,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { EditButton } from '@/components/ActionButtons';
const DinhMucBoSung = ({
  supplementaryStandard,
  onSaveSupplementary, // This will be handleSaveSupplementary from the hook
  // isLoading: propIsLoading, // To differentiate from internal loading if any
}) => {
  const muiTheme = useTheme();
  // const [isEditing, setIsEditing] = useState(false); // Removed for modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editValue, setEditValue] = useState(String(supplementaryStandard));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    // Only update editValue if modal is not open, to avoid overwriting user input
    if (!isModalOpen) {
      setEditValue(String(supplementaryStandard));
    }
    // setError(''); // Error reset will be handled by modal open/close
  }, [supplementaryStandard, isModalOpen]);
  const handleOpenModal = () => {
    setEditValue(String(supplementaryStandard)); // Initialize with current value
    setError('');
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Optionally reset editValue to original if not saved, or let useEffect handle it
    // setEditValue(String(supplementaryStandard));
    setError('');
  };
  const handleSave = async () => {
    const numericValue = parseFloat(editValue);
    if (editValue.trim() === '') {
      setError('Giá trị không được để trống.');
      return;
    }
    if (isNaN(numericValue)) {
      setError('Vui lòng nhập một số hợp lệ.');
      return;
    }
    if (numericValue < 0) {
      setError('Giá trị không được âm.');
      return;
    }
    setError(''); // Clear error if validation passes
    // Compare string values to avoid type issues, ensure current value is also string
    if (editValue === String(supplementaryStandard)) {
      handleCloseModal(); // Close modal if value is unchanged
      return;
    }
    setIsSaving(true);
    try {
      await onSaveSupplementary(parseFloat(editValue)); // Send as number
      handleCloseModal();
    } catch (error) {

      // Optionally, show a local error message or rely on parent's snackbar
    } finally {
      setIsSaving(false);
    }
  };
  const handleKeyPress = event => {
    if (event.key === 'Enter') {
      handleSave();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };
  return (
    <Paper
      elevation={2}
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        mb: 3,
        mt: { xs: 1, md: 2 },
        borderRadius: 2,
        boxShadow: muiTheme.customShadows ? muiTheme.customShadows.card : muiTheme.shadows[1],
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="flex-start" sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'baseline',
            backgroundColor: muiTheme.palette.background.paper,
            color: muiTheme.palette.text.primary,
            p: { xs: 1.5, sm: 2 },
            borderRadius: muiTheme.shape.borderRadius * 1.5,
            boxSizing: 'border-box',
            mr: 1.5,
          }}
        >
          <Typography
            variant="h2"
            component="span"
            sx={{
              fontWeight: 'bold',
              lineHeight: 1,
              color: muiTheme.palette.text.primary,
              mr: 0.75,
            }}
          >
            {supplementaryStandard}
          </Typography>
          <Typography
            variant="subtitle2"
            component="span"
            sx={{ color: muiTheme.palette.text.secondary }}
          >
            lít/chuyến
          </Typography>
        </Box>
        <EditButton
          onClick={handleOpenModal}
          size="medium"
          sx={{
            color: muiTheme.palette.primary.main,
            flexShrink: 0,
          }}
        />
      </Stack>
      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="edit-supplementary-standard-dialog"
      >
        <DialogContent
          sx={{
            pt: '20px !important' /* Override default DialogContent top padding if DialogTitle is absent*/,
          }}
        >
          <FormControl fullWidth error={!!error} sx={{ mt: 1 }}>
            <TextField
              id="dinh-muc-bo-sung-modal-input"
              label="Định mức bổ sung"
              type="number"
              variant="outlined"
              value={editValue}
              onChange={e => {
                const val = e.target.value;
                setEditValue(val);
                if (val.trim() === '') {
                  setError('Giá trị không được để trống.');
                } else if (
                  isNaN(parseFloat(val)) &&
                  val !== '' &&
                  val !== '-' &&
                  !val.endsWith('.')
                ) {
                  setError('Vui lòng nhập một số hợp lệ.');
                } else if (parseFloat(val) < 0) {
                  setError('Giá trị không được âm.');
                } else {
                  setError('');
                }
              }}
              onKeyDown={event => {
                if (
                  event.key === 'Enter' &&
                  !isSaving &&
                  !error &&
                  !(editValue.trim() === '' || editValue === String(supplementaryStandard))
                ) {
                  handleSave();
                } else if (event.key === 'Escape') {
                  handleCloseModal();
                }
              }}
              InputProps={{
                endAdornment: <InputAdornment position="end">lít/chuyến</InputAdornment>,
                inputProps: { step: 'any' },
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontSize: '1rem',
                  textAlign: 'left',
                },
              }}
              autoFocus
              required
            />
            {error && <FormHelperText sx={{ ml: '14px' }}>{error}</FormHelperText>}
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button
            onClick={handleCloseModal}
            variant="outlined"
            color="inherit"
            sx={{ minWidth: '100px' }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={
              isSaving ||
              !!error ||
              editValue.trim() === '' ||
              editValue === String(supplementaryStandard)
            }
            sx={{ minWidth: '100px' }}
          >
            {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
export default DinhMucBoSung;
