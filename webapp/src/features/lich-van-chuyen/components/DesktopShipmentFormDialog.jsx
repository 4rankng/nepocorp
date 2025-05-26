import React from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const DesktopShipmentFormDialog = ({
  open,
  onClose,
  editingPlan,
  formData,
  onFormChange,
  onContainerFormChange,
  onAddContainerField,
  onRemoveContainerField,
  onSave,
  isLoading,
  error,
  selectOptions,
  roleConfig, // Ensure roleConfig is received as a prop
}) => {
  const handleSubmit = e => {
    e.preventDefault();
    onSave();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ py: 2, px: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            {editingPlan ? 'Chỉnh sửa Lịch vận chuyển' : 'Tạo mới Lịch vận chuyển'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Grid container spacing={2}>
              {roleConfig.formFields.map(field => {
                // Skip containerInfo type here, it's handled separately below
                if (field.type === 'containerInfo') return null;

                // Conditional rendering for trangThai field
                if (field.name === 'trangThai' && field.onlyOnEdit && !editingPlan) {
                  return null;
                }

                return (
                  <Grid item {...field.gridWidths} key={field.name}>
                    <TextField
                      fullWidth
                      name={field.name}
                      id={field.name}
                      label={field.label}
                      type={field.type === 'date' || field.type === 'number' ? field.type : 'text'}
                      value={formData[field.name] || ''}
                      onChange={onFormChange}
                      select={field.type === 'select'}
                      required={field.required}
                      multiline={field.type === 'textarea'}
                      rows={field.type === 'textarea' ? field.rows || 2 : undefined}
                      InputLabelProps={field.type === 'date' ? { shrink: true } : {}}
                      InputProps={field.type === 'number' ? { inputProps: { min: 0 } } : {}}
                      variant="outlined"
                      size="small"
                    >
                      {field.type === 'select' && (
                        <MenuItem key={`empty-${field.name}`} value="">
                          <em>Chọn {field.label.replace('(*)', '').trim()}</em>
                        </MenuItem>
                      )}
                      {field.type === 'select' &&
                        selectOptions[field.optionsKey]?.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      {field.type === 'select' && field.optionsKey === 'statusOptions' && roleConfig.statusOptions &&
                        roleConfig.statusOptions.map(option => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                    </TextField>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Static rendering for Container Info for now, or integrate if part of formFields */}
            {roleConfig.formFields.find(f => f.type === 'containerInfo') && (
            <Box sx={{ mt: 2, border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'medium' }}>
                {roleConfig.formFields.find(f => f.type === 'containerInfo').label || "Thông tin Container"}
              </Typography>
              {/* Assuming formData.thongTinContainer is an array */}
              {formData.thongTinContainer?.map((cont, index) => (
                <Grid
                  container
                  spacing={2}
                  key={index}
                  alignItems="center"
                  sx={{ mb: index < formData.thongTinContainer.length - 1 ? 2 : 0 }}
                >
                  <Grid item {...(roleConfig.formFields.find(f => f.type === 'containerInfo')?.fields?.find(sf => sf.name === 'soContainer')?.gridWidths || {xs:12, sm: 5})}>
                    <TextField
                      fullWidth
                      name="soContainer"
                      value={cont.soContainer || ''}
                      onChange={e => onContainerFormChange(index, e)}
                      label={`Số container ${index + 1}`}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item {...(roleConfig.formFields.find(f => f.type === 'containerInfo')?.fields?.find(sf => sf.name === 'soSeal')?.gridWidths || {xs:12, sm: 5})}>
                    <TextField
                      fullWidth
                      name="soSeal"
                      value={cont.soSeal || ''}
                      onChange={e => onContainerFormChange(index, e)}
                      label={`Số seal ${index + 1}`}
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    {formData.thongTinContainer.length > 1 && (
                      <IconButton
                        onClick={() => onRemoveContainerField(index)}
                        color="error"
                        size="small"
                      >
                        <RemoveIcon />
                      </IconButton>
                    )}
                  </Grid>
                </Grid>
              ))}
              <Button
                type="button"
                onClick={onAddContainerField}
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                sx={{ mt: 2 }}
              >
                Thêm container
              </Button>
            </Box>
            )}
            {/* The trangThai field is now part of the dynamic loop if !onlyOnEdit || editingPlan */}
          </Box>
        </DialogContent>
        <DialogActions
          sx={{ py: 2, px: 3, borderTop: '1px solid', borderColor: 'divider', gap: 1 }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={onClose}
            disabled={isLoading}
            sx={{ textTransform: 'none' }}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{ textTransform: 'none' }}
          >
            {isLoading
              ? editingPlan
                ? 'Đang sửa...'
                : 'Đang lưu...'
              : editingPlan
                ? 'Sửa'
                : 'Lưu'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

DesktopShipmentFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  editingPlan: PropTypes.object, // Can be null if adding
  formData: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  onContainerFormChange: PropTypes.func.isRequired,
  onAddContainerField: PropTypes.func.isRequired,
  onRemoveContainerField: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectOptions: PropTypes.object.isRequired, // Became more generic due to dynamic optionsKeys
  roleConfig: PropTypes.object.isRequired, // Added roleConfig prop type
};

export default DesktopShipmentFormDialog;
