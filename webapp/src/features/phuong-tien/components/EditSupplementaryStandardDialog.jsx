import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
const EditSupplementaryStandardDialog = ({ open, onClose, initialValue, onSave, isLoading }) => {
  const [currentValue, setCurrentValue] = useState(initialValue);
  useEffect(() => {
    if (open) {
      setCurrentValue(initialValue);
    }
  }, [open, initialValue]);
  const handleSaveClick = () => {
    if (onSave) {
      onSave(currentValue);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Cập nhật định mức bổ sung</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Định mức bổ sung (L/chuyến)"
          type="number"
          fullWidth
          variant="outlined"
          value={currentValue}
          onChange={e => setCurrentValue(parseFloat(e.target.value) || 0)}
          inputProps={{
            step: 0.1,
            min: 0,
          }}
          sx={{ mt: 1 }} // Added margin top for better spacing
        />
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px' }}>
        <Button onClick={onClose} disabled={isLoading} color="inherit">
          Hủy
        </Button>
        <Button
          onClick={handleSaveClick}
          variant="contained"
          color="primary"
          disabled={isLoading || currentValue === initialValue} // Disable if no change or loading
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isLoading ? 'Đang lưu...' : 'Lưu'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default EditSupplementaryStandardDialog;
