import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Typography, Box, Alert, CircularProgress, Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close'; // For title
import {
  addDetailedOtherCostItem,
  deleteDetailedOtherCostItem,
} from '@services/mockData/shipmentPlans'; // Adjust path as needed

const DetailedCostsModal = ({ open, onClose, planId, initialCosts, onSaveSuccess }) => {
  const [costs, setCosts] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading for clarity (form submission vs data loading)
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCosts(initialCosts ? [...initialCosts] : []);
      setNewItemName('');
      setNewItemAmount('');
      setError('');
      setIsSubmitting(false);
    }
  }, [open, initialCosts]);

  const handleAddItem = async (event) => {
    event.preventDefault(); // Prevent default form submission if wrapped in a form
    if (!newItemName.trim() || !newItemAmount || isNaN(parseFloat(newItemAmount)) || parseFloat(newItemAmount) <= 0) {
      setError('Vui lòng nhập tên và số tiền hợp lệ (lớn hơn 0).');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      // Ensure newItemAmount is a number before sending
      const amountAsNumber = parseFloat(newItemAmount);
      const addedItem = await addDetailedOtherCostItem(planId, newItemName.trim(), amountAsNumber);
      setCosts(prevCosts => [...prevCosts, addedItem]);
      setNewItemName('');
      setNewItemAmount('');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm chi phí.');
      console.error("Error adding detailed cost:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    setIsSubmitting(true);
    setError('');
    try {
      await deleteDetailedOtherCostItem(planId, itemId);
      setCosts(prevCosts => prevCosts.filter(cost => cost.id !== itemId));
      if (onSaveSuccess) onSaveSuccess();
    } catch (err)
{
      setError(err.message || 'Lỗi khi xóa chi phí.');
      console.error("Error deleting detailed cost:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ component: 'form', onSubmit: handleAddItem }}>
      <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.5, px: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Chi tiết Chi phí khác {planId ? `cho chuyến ${planId}` : ''}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}> {/* Added some padding top */}
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}
        
        <Grid container spacing={1.5} sx={{ mb: 2.5, alignItems: 'center' }}>
          <Grid item xs={12} sm>
            <TextField
              label="Tên chi phí"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              disabled={isSubmitting}
              size="small"
              fullWidth
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} sm="auto">
            <TextField
              label="Số tiền"
              type="number"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              disabled={isSubmitting}
              size="small"
              variant="outlined"
              InputProps={{ inputProps: { min: 1 } }} // Ensure positive numbers
              sx={{ width: { xs: '100%', sm: '150px' } }}
            />
          </Grid>
          <Grid item xs={12} sm="auto">
            <Button 
              type="submit" // Changed to type submit for form handling
              disabled={isSubmitting} 
              variant="contained" 
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <AddIcon />} 
              size="medium"
              fullWidth // Make button full width on xs screens
              sx={{ height: '40px' }} // Match TextField small height
            >
              {isSubmitting ? 'Đang thêm...' : 'Thêm'}
            </Button>
          </Grid>
        </Grid>

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
          Danh sách chi phí:
        </Typography>
        {costs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
            Chưa có chi phí nào được thêm.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 300, overflow: 'auto', pr: 0.5 }}> {/* Added some padding right for scrollbar */}
            {costs.map((cost) => (
              <ListItem 
                key={cost.id} 
                divider 
                sx={{ 
                  py: 1,
                  '&:hover': { backgroundColor: 'action.hover' },
                  borderRadius: 1,
                  mb: 0.5
                }}
              >
                <ListItemText 
                  primary={<Typography variant="body1">{cost.name}</Typography>} 
                  secondary={<Typography variant="body2" color="text.secondary">{`Số tiền: ${Number(cost.amount).toLocaleString('vi-VN')} VND`}</Typography>} 
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={() => handleDeleteItem(cost.id)} 
                    disabled={isSubmitting} 
                    color="error"
                    size="small" // Consistent button size
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ borderTop: '1px solid', borderColor: 'divider', py: 1.5, px: 2 }}>
        <Button onClick={onClose} variant="outlined" color="inherit" sx={{textTransform: 'none'}}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

DetailedCostsModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  planId: PropTypes.string.isRequired,
  initialCosts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    amount: PropTypes.number.isRequired,
  })),
  onSaveSuccess: PropTypes.func,
};

DetailedCostsModal.defaultProps = {
  initialCosts: [],
};

export default DetailedCostsModal;
