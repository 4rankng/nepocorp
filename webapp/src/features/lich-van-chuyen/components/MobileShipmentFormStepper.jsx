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
  Chip,
  Fade,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  InputAdornment,
  IconButton,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ContainerIcon from '@mui/icons-material/Inventory2'; // Corrected from wrong import in original
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

// Props: editingPlan, initialFormData, onFormChange, onContainerFormChange, onAddContainerField, onRemoveContainerField,
// onSave, isLoading, error, selectOptions, initialActiveStep = 0

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
  selectOptions,
  onClose, // To allow stepper to request dialog close (though not directly used in this version)
}) => {
  const [activeStep, setActiveStep] = useState(0);

  // Reset activeStep when editingPlan changes (e.g. opening for add after an edit)
  useEffect(() => {
    setActiveStep(0);
  }, [editingPlan]);


  const getFormSteps = () => [
    {
      label: 'Thông tin cơ bản',
      fields: ['ngayThang', 'dienGiai', 'khachHangId', 'trangThai'],
      icon: <CalendarTodayIcon />,
    },
    {
      label: 'Container & Tuyến đường',
      fields: ['soLuongContainer', 'loaiContainerId', 'tuyenDuongDi', 'tuyenDuongDen'],
      icon: <ContainerIcon />,
    },
    {
      label: 'Phương tiện & Đối tác',
      fields: ['bienSoXeId', 'doiTacId'],
      icon: <LocalShippingIcon />,
    },
    {
      label: 'Chi phí & Container',
      fields: ['cuocVanChuyen', 'cuocThueVanChuyen', 'thongTinContainer', 'ngayHaHang'],
      icon: <AttachMoneyIcon />,
    },
  ];

  const getFieldLabel = (field) => {
    const labels = {
      ngayThang: 'Ngày tháng',
      dienGiai: 'Diễn giải',
      khachHangId: 'Khách hàng',
      trangThai: 'Trạng thái',
      soLuongContainer: 'Số lượng container',
      loaiContainerId: 'Loại container',
      tuyenDuongDi: 'Tuyến đường đi',
      tuyenDuongDen: 'Tuyến đường đến',
      bienSoXeId: 'Biển số xe',
      doiTacId: 'Đối tác',
      cuocVanChuyen: 'Cước vận chuyển',
      cuocThueVanChuyen: 'Cước thuê vận chuyển',
      ngayHaHang: 'Ngày hạ hàng',
    };
    return labels[field] || field;
  };

  const isStepComplete = (stepIndex) => {
    const steps = getFormSteps();
    const stepFields = steps[stepIndex]?.fields || [];
    return stepFields.every(field => {
      if (field === 'thongTinContainer') {
        // Ensure formData.thongTinContainer is always an array
        return (formData.thongTinContainer || []).every(container =>
          container.soContainer && container.soContainer.trim() !== ''
        );
      }
      const value = formData[field];
      return value !== '' && value !== null && value !== undefined;
    });
  };

  const getStepValidationErrors = (stepIndex) => {
    const steps = getFormSteps();
    const stepFields = steps[stepIndex]?.fields || [];
    const currentErrors = [];

    stepFields.forEach(field => {
      if (field === 'thongTinContainer') {
        (formData.thongTinContainer || []).forEach((container, index) => {
          if (!container.soContainer || !container.soContainer.trim()) {
            currentErrors.push(`Số container ${index + 1} không được trống`);
          }
        });
      } else if (!formData[field] || (typeof formData[field] === 'string' && formData[field].trim() === '')) {
        currentErrors.push(`${getFieldLabel(field)} không được trống`);
      }
    });
    return currentErrors;
  };


  const handleNextStep = () => {
    setActiveStep(prev => Math.min(prev + 1, getFormSteps().length - 1));
  };

  const handlePrevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const handleStepClick = (step) => {
    setActiveStep(step);
  };

  const handleSubmit = () => {
    // Perform final validation if needed, or rely on parent's onSave
    onSave();
  };
  
  const steps = getFormSteps();
  const currentStepErrors = getStepValidationErrors(activeStep);

  // This function was originally part of QuanLyLichVanChuyen, now self-contained for the stepper's rendering logic
  const renderStepContent = (stepIndex) => {
    const stepFields = steps[stepIndex].fields;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {stepFields.map(field => {
          switch (field) {
            case 'ngayThang':
              return (
                <TextField
                  key={field}
                  fullWidth
                  type="date"
                  label="Ngày tháng"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  InputLabelProps={{ shrink: true }}
                  size="small" 
                  sx={{ minHeight: 56 }} 
                />
              );

            case 'dienGiai':
              return (
                <TextField
                  key={field}
                  fullWidth
                  label="Diễn giải"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  multiline
                  rows={3}
                  placeholder="Mô tả chi tiết về lịch vận chuyển..."
                  size="small" 
                />
              );

            case 'khachHangId':
              return (
                <FormControl key={field} fullWidth size="small"> 
                  <InputLabel>Khách hàng</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={onFormChange}
                    label="Khách hàng"
                  >
                    {(selectOptions.customers || []).map(customer => (
                      <MenuItem key={customer.value} value={customer.value}>
                        {customer.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case 'trangThai':
              return (
                <FormControl key={field} fullWidth size="small"> 
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={onFormChange}
                    label="Trạng thái"
                  >
                    <MenuItem value="Lên lịch">Lên lịch</MenuItem>
                    <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
                    <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                    <MenuItem value="Hủy">Hủy</MenuItem>
                  </Select>
                </FormControl>
              );

            case 'soLuongContainer':
              return (
                <TextField
                  key={field}
                  fullWidth
                  type="number"
                  label="Số lượng container"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  InputProps={{
                    inputProps: { min: 1, max: 50 }
                  }}
                  size="small" 
                />
              );

            case 'loaiContainerId':
              return (
                <FormControl key={field} fullWidth size="small"> 
                  <InputLabel>Loại container</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={onFormChange}
                    label="Loại container"
                  >
                    {(selectOptions.containerTypes || []).map(type => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case 'tuyenDuongDi':
              return (
                <TextField
                  key={field}
                  fullWidth
                  label="Tuyến đường đi"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
                  size="small" 
                />
              );

            case 'tuyenDuongDen':
              return (
                <TextField
                  key={field}
                  fullWidth
                  label="Tuyến đường đến"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  placeholder="Ví dụ: Hà Nội, Đà Nẵng"
                  helperText="Có thể nhập nhiều điểm đến, cách nhau bằng dấu phẩy"
                  size="small" 
                />
              );

            case 'bienSoXeId':
              return (
                <FormControl key={field} fullWidth size="small"> 
                  <InputLabel>Biển số xe</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={onFormChange}
                    label="Biển số xe"
                  >
                    {(selectOptions.vehicles || []).map(vehicle => (
                      <MenuItem key={vehicle.value} value={vehicle.value}>
                        {vehicle.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case 'doiTacId':
              return (
                <FormControl key={field} fullWidth size="small"> 
                  <InputLabel>Đối tác vận chuyển</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={onFormChange}
                    label="Đối tác vận chuyển"
                  >
                    {(selectOptions.partners || []).map(partner => (
                      <MenuItem key={partner.value} value={partner.value}>
                        {partner.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case 'cuocVanChuyen':
              return (
                <TextField
                  key={field}
                  fullWidth
                  type="number"
                  label="Cước vận chuyển"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  InputProps={{
                    inputProps: { min: 0, step: 1000 },
                    endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
                  }}
                  size="small" 
                />
              );

            case 'cuocThueVanChuyen':
              return (
                <TextField
                  key={field}
                  fullWidth
                  type="number"
                  label="Cước thuê vận chuyển"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  InputProps={{
                    inputProps: { min: 0, step: 1000 },
                    endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
                  }}
                  size="small" 
                />
              );

            case 'ngayHaHang':
              return (
                <TextField
                  key={field}
                  fullWidth
                  type="date"
                  label="Ngày hạ hàng"
                  name={field}
                  value={formData[field]}
                  onChange={onFormChange}
                  InputLabelProps={{ shrink: true }}
                  size="small" 
                />
              );

            case 'thongTinContainer':
              return (
                <Box key={field}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Thông tin container
                  </Typography>
                  {(formData.thongTinContainer || []).map((container, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2">
                          Container {index + 1}
                        </Typography>
                        {formData.thongTinContainer.length > 1 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => onRemoveContainerField(index)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                          fullWidth
                          label="Số container"
                          name="soContainer"
                          value={container.soContainer}
                          onChange={(e) => onContainerFormChange(index, e)}
                          placeholder="Ví dụ: CONT123456"
                          size="small" 
                        />
                        <TextField
                          fullWidth
                          label="Số seal"
                          name="soSeal"
                          value={container.soSeal}
                          onChange={(e) => onContainerFormChange(index, e)}
                          placeholder="Ví dụ: SEAL789"
                          size="small" 
                        />
                      </Box>
                    </Card>
                  ))}

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={onAddContainerField}
                    fullWidth
                    sx={{
                      minHeight: 48,
                      borderStyle: 'dashed',
                      borderWidth: 2
                    }}
                  >
                    Thêm container
                  </Button>
                </Box>
              );
            default:
              return null;
          }
        })}
      </Box>
    );
  };


  return (
    <Box>
      {/* Progress Indicator */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {editingPlan ? 'Chỉnh sửa lịch vận chuyển' : 'Thêm lịch vận chuyển mới'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activeStep + 1}/{steps.length}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={((activeStep + 1) / steps.length) * 100}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            },
          }}
        />
      </Box>

      {/* Step Navigation */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
          {steps.map((step, index) => (
            <Chip
              key={index}
              icon={step.icon}
              label={step.label}
              variant={index === activeStep ? 'filled' : 'outlined'}
              color={isStepComplete(index) ? 'success' : index === activeStep ? 'primary' : 'default'}
              onClick={() => handleStepClick(index)}
              sx={{
                minHeight: 40,
                '& .MuiChip-icon': { fontSize: 18 },
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': { transform: 'scale(1.05)' },
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Error display for the current step, or global form error passed from parent */}
      {error && !currentStepErrors.length && ( // Show global error if no step errors
         <Alert severity="error" sx={{ mb: 2, borderRadius: 2}}>
           {error}
         </Alert>
      )}


      {/* Current Step Content */}
      <Fade in={true} key={activeStep} timeout={300}>
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {steps[activeStep].icon}
              <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                {steps[activeStep].label}
              </Typography>
            </Box>
            {renderStepContent(activeStep)}
            {currentStepErrors.length > 0 && (
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Vui lòng kiểm tra lại:
                </Typography>
                {currentStepErrors.map((err, index) => (
                  <Typography key={index} variant="caption" display="block">
                    • {err}
                  </Typography>
                ))}
              </Alert>
            )}
          </CardContent>
        </Card>
      </Fade>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<NavigateBeforeIcon />}
          onClick={handlePrevStep}
          disabled={activeStep === 0 || isLoading}
          sx={{ minHeight: 48, borderRadius: 3, flex: 1 }}
        >
          Quay lại
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
            onClick={handleSubmit}
            disabled={isLoading || currentStepErrors.length > 0}
            sx={{
              minHeight: 48,
              borderRadius: 3,
              flex: 2,
              background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
            }}
          >
            {isLoading ? (editingPlan ? 'Đang cập nhật...' : 'Đang tạo...') : (editingPlan ? 'Cập nhật' : 'Tạo lịch')}
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<NavigateNextIcon />}
            onClick={handleNextStep}
            disabled={isLoading}
            sx={{ minHeight: 48, borderRadius: 3, flex: 2 }}
          >
            Tiếp theo
          </Button>
        )}
      </Box>
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
  }).isRequired,
  onClose: PropTypes.func, // Not strictly required by this component internally for now
};

export default MobileShipmentFormStepper;
