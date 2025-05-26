import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Grid, // Though not used in current renderStepContent, good for future consistency
  LinearProgress,
  Fade,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ContainerIcon from '@mui/icons-material/Inventory2'; // Corrected from wrong import in original
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CloseIcon from '@mui/icons-material/Close';
import { CustomerForm } from '@features/khach-hang';
import PartnerForm from '@features/doi-tac/components/PartnerForm';

// No longer importing mock API services directly here, parent will provide options

// Props: editingPlan, formData, onFormChange, onContainerFormChange, onAddContainerField, onRemoveContainerField,
// onSave, isLoading, error, selectOptions (from parent), onClose, onAddNewCustomer, onAddNewPartner, roleConfig

const MobileShipmentFormStepper = ({
  editingPlan,
  formData, // This is the formData from the parent (QuanLyLichVanChuyen)
  onFormChange, // Parent's handleInputChange
  onContainerFormChange, // Parent's handleContainerInfoChange
  onAddContainerField, // Parent's addContainerField
  onRemoveContainerField, // Parent's removeContainerField
  onSave, // Parent's handleSavePlan
  isLoading,
  error, // Error string from parent
  selectOptions, // selectOptions are now directly from parent
  onClose,
  onAddNewCustomer, // Function to add new customer from parent
  onAddNewPartner, // Function to add new partner from parent
  roleConfig, // Added roleConfig prop
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [validationAttempted, setValidationAttempted] = useState({});
  const [customerDialog, setCustomerDialog] = useState({ open: false });
  const [partnerDialog, setPartnerDialog] = useState({ open: false, partner: null });
  // Removed internal selectOptions state and related loading/error states

  useEffect(() => {
    setActiveStep(0);
    setValidationAttempted({});
    // Log the received props for debugging
    console.log('MobileShipmentFormStepper - Component mounted/updated:', {
      formData,
      editingPlan,
      roleConfigName: roleConfig?.componentName,
    });
  }, [editingPlan, roleConfig]);

  const getFormSteps = () => {
    let steps = [
      {
        label: 'Thông tin cơ bản',
        icon: <CalendarTodayIcon />,
        fields: ['ngayThang', 'khachHangId', 'doiTacId', 'phuongTienId', 'tuyenDuongId', 'dienGiai'],
      },
      {
        label: 'Container & Seal',
        icon: <ContainerIcon />,
        fields: ['thongTinContainer'], // This will be handled by a custom renderer
      },
    ];

    if (roleConfig.componentName === 'LichVanChuyenKeToan') {
      steps.push({
        label: 'Thông tin chi phí',
        icon: <AttachMoneyIcon />,
        fields: [
          'kmVanChuyenCoHang',
          'kmVanChuyenRong',
          'chiPhiDauSoLuong',
          'chiPhiDauDonGia',
          'dinhMucDiDuong',
        ],
      });
    }

    // Common last step for trangThai, if applicable
    // The 'trangThai' field might be present for both roles, but its visibility on add/edit differs.
    const trangThaiField = roleConfig.formFields.find(f => f.name === 'trangThai');
    if (trangThaiField) {
        if (!trangThaiField.onlyOnEdit || editingPlan) {
             // If it's always shown, or if it's onlyOnEdit and we are editing
            steps.push({
                label: 'Trạng thái',
                icon: <CheckCircleIcon />,
                fields: ['trangThai'],
            });
        } else if (editingPlan && trangThaiField.onlyOnEdit) {
            // This case is covered above, but kept for clarity
             steps.push({
                label: 'Trạng thái',
                icon: <CheckCircleIcon />,
                fields: ['trangThai'],
            });
        }
    }
    return steps;
  };
  
  // getFieldLabel is no longer needed as label comes from roleConfig.formFields

  const getStepValidationErrors = stepIndex => {
    const currentErrors = [];
    const step = getFormSteps()[stepIndex];
    if (!step) return currentErrors;

    step.fields.forEach(fieldName => {
      const fieldConfig = roleConfig.formFields.find(f => f.name === fieldName);
      if (fieldConfig?.required) {
        if (fieldConfig.type === 'containerInfo') {
          // Basic validation for container info: at least one entry, and soContainer is filled
          if (!formData.thongTinContainer || formData.thongTinContainer.length === 0) {
            currentErrors.push(`${fieldConfig.label} không được trống`);
          } else {
            formData.thongTinContainer.forEach((container, idx) => {
              if (!container.soContainer || !container.soContainer.trim()) {
                currentErrors.push(`Số container ${idx + 1} không được trống`);
              }
              // soSeal can be optional based on requirements
            });
          }
        } else if (!formData[fieldName] || (typeof formData[fieldName] === 'string' && !formData[fieldName].trim())) {
          currentErrors.push(`${fieldConfig.label.replace('(*)', '').trim()} không được trống`);
        } else if (fieldConfig.type === 'number' && typeof formData[fieldName] === 'number' && formData[fieldName] < 0) {
           currentErrors.push(`${fieldConfig.label.replace('(*)', '').trim()} không hợp lệ`);
        }
      }
    });
    return currentErrors;
  };

  const handleNextStep = () => {
    setValidationAttempted(prev => ({ ...prev, [activeStep]: true }));
    const currentStepErrors = getStepValidationErrors(activeStep);
    if (currentStepErrors.length > 0) return;

    const nextStep = Math.min(activeStep + 1, getFormSteps().length - 1);
    setActiveStep(nextStep);
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(activeStep - 1, 0);
    setActiveStep(prevStep);
  };

  const handleSubmit = () => {
    setValidationAttempted(prev => ({ ...prev, [activeStep]: true }));
    const currentStepErrors = getStepValidationErrors(activeStep);
    if (currentStepErrors.length > 0) return;
    onSave();
  };

  const handleOpenCustomerDialog = () => setCustomerDialog({ open: true });
  const handleCloseCustomerDialog = () => setCustomerDialog({ open: false });

  const handleCustomerSave = async customerData => {
    try {
      if (onAddNewCustomer) {
        const newCustomerId = await onAddNewCustomer(customerData.name);
        if (newCustomerId) {
          onFormChange({ target: { name: 'khachHangId', value: newCustomerId } });
        }
      }
      handleCloseCustomerDialog();
    } catch (err) {
      console.error('Error adding customer:', err);
      // Parent should show error via its own error state
    }
  };
  
  const handleOpenPartnerDialog = () => setPartnerDialog({ open: true, partner: null });
  const handleClosePartnerDialog = () => setPartnerDialog({ open: false });

  const handleSavePartner = async partnerData => {
    try {
      if (onAddNewPartner) {
        const newPartnerId = await onAddNewPartner(partnerData.name); // Assuming addPartner returns new partner's ID
        if (newPartnerId) {
            onFormChange({ target: { name: 'doiTacId', value: newPartnerId } });
        }
      }
      handleClosePartnerDialog();
      return { success: true };
    } catch (err) {
      console.error('Error adding partner:', err);
      return { success: false, error: 'Không thể thêm đối tác' };
    }
  };


  const steps = getFormSteps();
  const currentStepErrors = getStepValidationErrors(activeStep);
  const shouldShowErrors = validationAttempted[activeStep] && currentStepErrors.length > 0;

  const renderStepContent = stepIndex => {
    const stepFieldNames = steps[stepIndex].fields;
    const fieldsToRender = roleConfig.formFields.filter(field => stepFieldNames.includes(field.name));

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {fieldsToRender.map(field => {
          if (field.type === 'containerInfo') {
            // Special rendering for container info
            return (
              <Box key={field.name}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 500, color: 'text.secondary' }}>
                  {field.label}
                </Typography>
                {(formData.thongTinContainer || [{soContainer: '', soSeal: ''}]).map((container, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>Container {index + 1}</Typography>
                      {formData.thongTinContainer && formData.thongTinContainer.length > 1 && (
                        <IconButton size="small" color="error" onClick={() => onRemoveContainerField(index)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    <Grid container spacing={2}>
                      {field.fields.map(subField => (
                        <Grid item {...subField.gridWidths} key={subField.name}>
                          <TextField
                            fullWidth
                            name={subField.name}
                            label={subField.label}
                            value={container[subField.name] || ''}
                            onChange={e => onContainerFormChange(index, e)}
                            size="small"
                            variant="outlined"
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Card>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={onAddContainerField}
                  fullWidth
                  size="small"
                  sx={{ mt: 0, borderStyle: 'dashed' }}
                >
                  Thêm container
                </Button>
              </Box>
            );
          }

          // Conditional rendering for trangThai field based on onlyOnEdit
          if (field.name === 'trangThai' && field.onlyOnEdit && !editingPlan) {
            return null;
          }
          
          const mainField = (
            <TextField
              fullWidth
              name={field.name}
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
              {/* Specifically for statusOptions from roleConfig if optionsKey matches */}
              {field.type === 'select' && field.optionsKey === 'statusOptions' && roleConfig.statusOptions &&
                roleConfig.statusOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
              ))}
            </TextField>
          );

          if (field.quickAddType) {
            return (
              <Box key={field.name} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>{mainField}</Box>
                <IconButton
                  onClick={field.quickAddType === 'customer' ? handleOpenCustomerDialog : handleOpenPartnerDialog}
                  size="small"
                  sx={{ flexShrink: 0, border: '1px solid', borderColor: 'divider', borderRadius: 1, p:0.9 }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          }
          return <Box key={field.name}>{mainField}</Box>;
        })}
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex',
        flexDirection: 'column', height: '100%', minHeight: '0' }}>
      <Box sx={{ flex: 1, overflow: 'auto', minHeight: '0' }}>
        {/* Header with Title, Step Counter, and Close Button */}
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {editingPlan ? 'Chỉnh sửa Lịch vận chuyển' : 'Tạo mới Lịch vận chuyển'} ({roleConfig.componentName.replace('LichVanChuyen', '')})
                </Typography>
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </Box>
            <LinearProgress variant="determinate" value={((activeStep + 1) / steps.length) * 100} sx={{ height: 6, borderRadius: 3 }} />
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, color: 'text.secondary' }}>
                Bước {activeStep + 1} / {steps.length}: {steps[activeStep]?.label}
            </Typography>
        </Box>

        {/* Error Alert */}
        {error && !shouldShowErrors && <Alert severity="error" sx={{ m: 2, borderRadius: 1.5 }}>{error}</Alert>}
        
        {/* Step Content */}
        <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
            <Fade in={true} key={activeStep}>
                <Box>
                    {renderStepContent(activeStep)}
                    {shouldShowErrors && (
                        <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>Vui lòng kiểm tra lại:</Typography>
                            {currentStepErrors.map((err, index) => (
                                <Typography key={index} variant="caption" display="block">• {err}</Typography>
                            ))}
                        </Alert>
                    )}
                </Box>
            </Fade>
        </Box>
      </Box>

      {/* Navigation Buttons */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', justifyContent: 'space-between' }}>
            <Button variant="outlined" startIcon={<NavigateBeforeIcon />} onClick={handlePrevStep} disabled={activeStep === 0 || isLoading}>Trước</Button>
            {activeStep === steps.length - 1 ? (
                <Button variant="contained" color="primary" startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />} onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? (editingPlan ? 'Đang sửa...' : 'Đang tạo...') : (editingPlan ? 'Lưu thay đổi' : 'Tạo mới')}
                </Button>
            ) : (
                <Button variant="contained" endIcon={<NavigateNextIcon />} onClick={handleNextStep} disabled={isLoading}>Tiếp</Button>
            )}
      </Box>
      
      {/* Customer Form Dialog - Re-using the existing one from QuanLyLichVanChuyen */}
      <CustomerForm
        open={customerDialog.open}
        onClose={handleCloseCustomerDialog}
        onSave={handleCustomerSave}
        isLoading={false}
      />

      {/* Partner Form Dialog */}
      <PartnerForm
        open={partnerDialog.open}
        onClose={handleClosePartnerDialog}
        onSave={handleSavePartner}
        partner={partnerDialog.partner}
        isLoading={isLoadingData}
      />
    </Box>
  );
};

MobileShipmentFormStepper.propTypes = {
  editingPlan: PropTypes.object,
  formData: PropTypes.object.isRequired,
  onFormChange: PropTypes.func.isRequired,
  onContainerFormChange: PropTypes.func.isRequired,
  onAddContainerField: PropTypes.func.isRequired,
  onRemoveContainerField: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectOptions: PropTypes.shape({
    customers: PropTypes.array,
    containerTypes: PropTypes.array,
    vehicles: PropTypes.array,
    partners: PropTypes.array,
  }), // Now optional since we fetch data internally
  onClose: PropTypes.func,
  onAddNewCustomer: PropTypes.func,
  onAddNewPartner: PropTypes.func,
  roleConfig: PropTypes.object.isRequired, // Added roleConfig
};

export default MobileShipmentFormStepper;
