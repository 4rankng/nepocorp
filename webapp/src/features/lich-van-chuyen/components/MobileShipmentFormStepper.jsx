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
import PartnerForm from '../../../features/doi-tac/components/PartnerForm';

// Import mock API services
import { getVehiclesForSelect } from '../../../services/mockData/vehicles.js';
import { getPartnersForSelect, addPartner } from '../../../services/mockData/partners.js';
import { getCustomersForSelect, addQuickCustomer } from '../../../services/mockData/customers.js';
import { getContainerTypesForSelect } from '../../../services/mockData/containers.js';

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
  selectOptions: initialSelectOptions, // Renamed to avoid confusion with internal state
  onClose, // To allow stepper to request dialog close (though not directly used in this version)
  onAddNewCustomer, // Function to add new customer from parent
  onAddNewPartner, // Function to add new partner from parent
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [validationAttempted, setValidationAttempted] = useState({}); // Track validation attempts per step
  const [customerDialog, setCustomerDialog] = useState({ open: false });
  const [partnerDialog, setPartnerDialog] = useState({ 
    open: false,
    partner: null
  });
  
  // Internal state for select options
  const [selectOptions, setSelectOptions] = useState({
    vehicles: [],
    partners: [],
    customers: [],
    containerTypes: [],
  });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  // Function to fetch all required data from mock APIs
  const fetchSelectOptionsData = async () => {
    setIsLoadingData(true);
    setDataError('');
    
    try {
      console.log('MobileShipmentFormStepper - Fetching select options data...');
      
      const [vehicles, partners, customers, containerTypes] = await Promise.all([
        getVehiclesForSelect(),
        getPartnersForSelect(),
        getCustomersForSelect(),
        getContainerTypesForSelect(),
      ]);

      // Transform data to match the expected format (with value and label properties)
      const transformedData = {
        vehicles: vehicles.map(v => ({ value: v.id, label: v.name || v.licensePlate })),
        partners: partners.map(p => ({ value: p.id, label: p.name })),
        customers: customers.map(c => ({ value: c.id, label: c.name })),
        containerTypes: containerTypes.map(ct => ({ value: ct.id, label: ct.name })),
      };

      setSelectOptions(transformedData);
      
      console.log('MobileShipmentFormStepper - Successfully fetched select options:', {
        vehicleCount: transformedData.vehicles.length,
        partnerCount: transformedData.partners.length,
        customerCount: transformedData.customers.length,
        containerTypeCount: transformedData.containerTypes.length,
        sampleData: {
          vehicles: transformedData.vehicles.slice(0, 2),
          customers: transformedData.customers.slice(0, 2),
        }
      });
      
    } catch (err) {
      console.error('MobileShipmentFormStepper - Error fetching select options:', err);
      setDataError('Không thể tải dữ liệu danh sách. Vui lòng thử lại.');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Reset activeStep and validation attempts when editingPlan changes
  // Also fetch select options data when component mounts
  useEffect(() => {
    setActiveStep(0);
    setValidationAttempted({});
    
    // Fetch select options data when component loads
    fetchSelectOptionsData();
    
    // Log the received props for debugging
    console.log('MobileShipmentFormStepper - Component mounted/updated:', {
      formData,
      editingPlan
    });
  }, [editingPlan]); // Only depend on editingPlan to avoid unnecessary re-fetches

  const getFieldOptions = (field) => {
    // Handle different field types and their options
    switch (field) {
      case 'khachHangId':
        return Array.isArray(selectOptions?.customers) ? selectOptions.customers : [];
      case 'loaiContainerId':
        return Array.isArray(selectOptions?.containerTypes) ? selectOptions.containerTypes : [];
      case 'bienSoXeId':
        return Array.isArray(selectOptions?.vehicles) ? selectOptions.vehicles : [];
      case 'doiTacId': // Fixed field name to match formData
        return Array.isArray(selectOptions?.partners) ? selectOptions.partners : [];
      default:
        return [];
    }
  };

  const getFormSteps = () => {
    const steps = [
      {
        label: 'Thông tin cơ bản',
        fields: ['ngayThang', 'dienGiai', 'khachHangId'],
        icon: <CalendarTodayIcon />,
      },
      {
        label: 'Tuyến đường',
        fields: ['tuyenDuongDi', 'tuyenDuongDen'],
        icon: <LocationOnIcon />,
      },
      {
        label: 'Phương tiện',
        fields: ['loaiContainerId', 'soLuongContainer', 'loaiXe', 'bienSoXeId', 'doiTacVanChuyen', 'cuocVanChuyen'],
        icon: <LocalShippingIcon />,
      },
    ];

    // Thêm step cho thông tin bổ sung khi chỉnh sửa
    if (editingPlan) {
      steps.push({
        label: 'Thông tin bổ sung',
        fields: ['trangThai', 'ngayHaHang', 'thongTinContainer'],
        icon: <AttachMoneyIcon />,
      });
    }

    return steps;
  };

  const getFieldLabel = (field) => {
    const labels = {
      ngayThang: 'Ngày tháng',
      dienGiai: 'Diễn giải',
      khachHangId: 'Khách hàng',
      trangThai: 'Trạng thái',
      soLuongContainer: 'Số lượng container',
      loaiContainerId: 'Loại container',
      tuyenDuongDi: 'Điểm đi',
      tuyenDuongDen: 'Điểm đến',
      bienSoXeId: 'Biển số xe',
      doiTacId: 'Đối tác',
      loaiXe: 'Loại xe',
      doiTacVanChuyen: 'Đối tác vận chuyển',
      cuocVanChuyen: 'Cước vận chuyển',
      cuocThueVanChuyen: 'Cước thuê vận chuyển',
      ngayHaHang: 'Ngày hạ hàng',
    };
    return labels[field] || field;
  };

  const isStepComplete = (stepIndex) => {
    return getStepValidationErrors(stepIndex).length === 0;
  };

  const getStepValidationErrors = (stepIndex) => {
    const currentErrors = [];

    switch (stepIndex) {
      case 0: // Thông tin cơ bản
        if (!formData.ngayThang || !formData.ngayThang.trim()) {
          currentErrors.push('Ngày tháng không được trống');
        }
        if (!formData.dienGiai || !formData.dienGiai.trim()) {
          currentErrors.push('Diễn giải không được trống');
        }
        if (!formData.khachHangId) {
          currentErrors.push('Khách hàng không được trống');
        }
        break;

      case 1: // Tuyến đường
        if (!formData.tuyenDuongDi || !formData.tuyenDuongDi.trim()) {
          currentErrors.push('Điểm đi không được trống');
        }
        if (!formData.tuyenDuongDen || !formData.tuyenDuongDen.trim()) {
          currentErrors.push('Điểm đến không được trống');
        }
        break;

      case 2: // Phương tiện
        if (!formData.loaiContainerId) {
          currentErrors.push('Loại container không được trống');
        }
        if (!formData.soLuongContainer || formData.soLuongContainer < 1) {
          currentErrors.push('Số lượng container phải lớn hơn 0');
        }
        const loaiXe = formData.loaiXe || 'xe-cong-ty';
        if (loaiXe === 'xe-cong-ty') {
          if (!formData.bienSoXeId) {
            currentErrors.push('Biển số xe không được trống');
          }
        } else {
          if (!formData.doiTacVanChuyen || !formData.doiTacVanChuyen.trim()) {
            currentErrors.push('Thông tin đối tác vận chuyển không được trống');
          }
        }
        if (!formData.cuocVanChuyen || formData.cuocVanChuyen < 0) {
          currentErrors.push('Cước vận chuyển không được để trống');
        }
        break;

      case 3: // Thông tin bổ sung (chỉ khi chỉnh sửa)
        if (editingPlan) {
          if (!formData.trangThai) {
            currentErrors.push('Trạng thái không được trống');
          }
          // Thông tin container và ngày hạ hàng không bắt buộc
        }
        break;

      default:
        break;
    }

    return currentErrors;
  };


  const handleNextStep = () => {
    // Mark validation as attempted for current step
    setValidationAttempted(prev => ({ ...prev, [activeStep]: true }));

    // Check if current step is valid
    const currentStepErrors = getStepValidationErrors(activeStep);
    if (currentStepErrors.length > 0) {
      // Don't proceed if there are validation errors
      return;
    }

    // Proceed to next step and reset validation attempt for next step
    const nextStep = Math.min(activeStep + 1, getFormSteps().length - 1);
    setActiveStep(nextStep);
  };

  const handlePrevStep = () => {
    const prevStep = Math.max(activeStep - 1, 0);
    setActiveStep(prevStep);
    // Don't reset validation attempts when going back - user might want to see previous errors
  };



    const handleSubmit = () => {
    // Mark validation as attempted for final step
    setValidationAttempted(prev => ({ ...prev, [activeStep]: true }));

    // Check if final step is valid
    const currentStepErrors = getStepValidationErrors(activeStep);
    if (currentStepErrors.length > 0) {
      // Don't submit if there are validation errors
      return;
    }

    // Proceed with submission
    onSave();
  };

    const handleOpenCustomerDialog = () => {
    setCustomerDialog({ open: true });
  };

  const handleCloseCustomerDialog = () => {
    setCustomerDialog({ open: false });
  };

  const handleCustomerSave = async (customerData) => {
    // Add customer and refresh customer list
    try {
      // Call the parent function if provided, otherwise use our own API call
      if (onAddNewCustomer) {
        const newCustomerId = await onAddNewCustomer(customerData.name);
        // Select the new customer if we got an ID back
        if (newCustomerId) {
          onFormChange({ target: { name: 'khachHangId', value: newCustomerId } });
        }
      } else {
        // Fallback: call API directly and refresh our select options
        await addQuickCustomer(customerData.name);
        await fetchSelectOptionsData(); // Refresh the options
      }
      
      // Close the dialog
      handleCloseCustomerDialog();
    } catch (error) {
      console.error('Error adding customer:', error);
      setDataError('Lỗi khi thêm khách hàng mới.');
      // Keep dialog open on error so user can see the error
    }
  };

  const handleOpenPartnerDialog = () => {
    setPartnerDialog({ 
      open: true,
      partner: null // New partner
    });
  };

  const handleClosePartnerDialog = () => {
    setPartnerDialog({ open: false });
  };

  const handleSavePartner = async (partnerData) => {
    try {
      // Add the new partner
      const newPartner = await addPartner(partnerData);
      
      // Update the form field with the new partner's name
      onFormChange({ target: { name: 'doiTacVanChuyen', value: newPartner.name } });
      
      // Refresh our select options to include the new partner
      await fetchSelectOptionsData();
      
      // Close the dialog
      handleClosePartnerDialog();
      
      return { success: true };
    } catch (error) {
      console.error('Error adding partner:', error);
      setDataError('Lỗi khi thêm đối tác mới.');
      return { success: false, error: 'Không thể thêm đối tác' };
    }
  };

  const steps = getFormSteps();
  const currentStepErrors = getStepValidationErrors(activeStep);
  const shouldShowErrors = validationAttempted[activeStep] && currentStepErrors.length > 0;



  // This function was originally part of QuanLyLichVanChuyen, now self-contained for the stepper's rendering logic
  const renderStepContent = (stepIndex) => {
    const stepFields = steps[stepIndex].fields;

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Custom rendering based on step */}
        {stepIndex === 0 && (
          <>
            {/* Thông tin cơ bản */}
            <TextField
              fullWidth
              type="date"
              label="Ngày tháng"
              name="ngayThang"
              value={formData.ngayThang}
              onChange={onFormChange}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ minHeight: 56 }}
            />
            <TextField
              fullWidth
              label="Diễn giải"
              name="dienGiai"
              value={formData.dienGiai}
              onChange={onFormChange}
              multiline
              rows={3}
              placeholder="Mô tả chi tiết về lịch vận chuyển..."
              size="small"
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>
              <FormControl fullWidth size="small">
                <InputLabel>Khách hàng</InputLabel>
                <Select
                  name="khachHangId"
                  value={formData.khachHangId}
                  onChange={onFormChange}
                  label="Khách hàng"
                  sx={{
                    height: '40px',
                    '& .MuiSelect-select': {
                      display: 'flex',
                      alignItems: 'center'
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 200,
                        '& .MuiMenuItem-root': {
                          fontSize: '14px',
                          py: 1
                        }
                      }
                    }
                  }}
                >
                  {(selectOptions.customers || []).map(customer => (
                    <MenuItem key={customer.value} value={customer.value}>
                      {customer.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <IconButton
                onClick={handleOpenCustomerDialog}
                sx={{
                  height: '40px',
                  width: '40px',
                  color: '#6b7280',
                  mt: '8px',
                  border: '1px solid #d1d5db',
                  borderRadius: 1,
                  backgroundColor: '#ffffff',
                  flexShrink: 0,
                  '&:hover': {
                    color: '#374151',
                    backgroundColor: '#f3f4f6',
                    borderColor: '#9ca3af'
                  }
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Box>
          </>
        )}

                {stepIndex === 1 && (
          <>
            {/* Tuyến đường - Direct Route Input */}
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {/* Điểm đi */}
                <TextField
                  fullWidth
                  placeholder="Nhập điểm đi"
                  value={formData.tuyenDuongDi || ''}
                  onChange={(e) => onFormChange({ target: { name: 'tuyenDuongDi', value: e.target.value } })}
                  size="small"
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: 1,
                      textAlign: 'center',
                      '&:hover': {
                        borderColor: '#9ca3af',
                      },
                      '&.Mui-focused': {
                        borderColor: '#6b7280',
                        backgroundColor: '#f9fafb',
                      }
                    },
                    '& .MuiOutlinedInput-input': {
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#374151',
                      padding: '8px 12px',
                    }
                  }}
                />

                                {/* Điểm đến */}
                {(() => {
                  // Parse destinations and ensure we always have at least one empty field for new input
                  const destinationsStr = formData.tuyenDuongDen || '';
                  const destinations = destinationsStr ? destinationsStr.split(',').map(d => d.trim()) : [''];

                  return destinations.map((destination, index) => (
                    <Box key={index}>
                      {/* Mũi tên */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.3 }}>
                        <Box sx={{
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '8px solid #1976D2'
                        }} />
                      </Box>

                      {/* Ô nhập điểm đến */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                          fullWidth
                          placeholder="Nhập điểm đến"
                          value={destination}
                          onChange={(e) => {
                            const newDestinations = [...destinations];
                            newDestinations[index] = e.target.value;
                            // Keep all destinations, including empty ones for editing
                            const newValue = newDestinations.join(', ');
                            onFormChange({ target: { name: 'tuyenDuongDen', value: newValue } });
                          }}
                          size="small"
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              backgroundColor: '#f8f9fa',
                              border: '1px solid #d1d5db',
                              borderRadius: 1,
                              textAlign: 'center',
                              '&:hover': {
                                borderColor: '#9ca3af',
                              },
                              '&.Mui-focused': {
                                borderColor: '#6b7280',
                                backgroundColor: '#f8f9fa',
                              }
                            },
                            '& .MuiOutlinedInput-input': {
                              textAlign: 'center',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: '#374151',
                              padding: '8px 12px',
                            }
                          }}
                        />

                        {/* Nút xóa điểm đến (chỉ hiện khi có > 1 điểm đến) */}
                        {destinations.length > 1 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              const newDestinations = destinations.filter((_, i) => i !== index);
                              const newValue = newDestinations.join(', ');
                              onFormChange({ target: { name: 'tuyenDuongDen', value: newValue } });
                            }}
                            sx={{ width: 32, height: 32 }}
                          >
                            <RemoveIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  ));
                })()}

                {/* Nút thêm điểm đến */}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const currentDestinations = formData.tuyenDuongDen || '';
                    // Add a new empty destination
                    const newValue = currentDestinations ? currentDestinations + ', ' : '';
                    onFormChange({ target: { name: 'tuyenDuongDen', value: newValue } });
                  }}
                  sx={{
                    mt: 1,
                    fontSize: '14px',
                    fontWeight: 500,
                    borderStyle: 'dashed',
                    borderWidth: 1,
                    borderColor: '#9ca3af',
                    color: '#6b7280',
                    '&:hover': {
                      borderColor: '#6b7280',
                      backgroundColor: 'rgba(107, 114, 128, 0.04)',
                    }
                  }}
                  size="small"
                >
                  Thêm điểm đến
                </Button>
              </Box>
            </Box>
          </>
        )}

        {stepIndex === 2 && (
          <>
            {/* Phương tiện */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Loại container</InputLabel>
                <Select
                  name="loaiContainerId"
                  value={formData.loaiContainerId}
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
              <TextField
                fullWidth
                type="number"
                label="Số lượng"
                name="soLuongContainer"
                value={formData.soLuongContainer}
                onChange={onFormChange}
                InputProps={{
                  inputProps: { min: 1, max: 50 }
                }}
                size="small"
              />
            </Box>

            <FormControl fullWidth size="small">
              <InputLabel>Loại xe</InputLabel>
              <Select
                name="loaiXe"
                value={formData.loaiXe || 'xe-cong-ty'}
                onChange={onFormChange}
                label="Loại xe"
              >
                <MenuItem value="xe-cong-ty">Xe công ty</MenuItem>
                <MenuItem value="xe-doi-tac">Xe đối tác</MenuItem>
              </Select>
            </FormControl>

            {(formData.loaiXe || 'xe-cong-ty') === 'xe-cong-ty' ? (
              <FormControl fullWidth size="small">
                <InputLabel>Biển số xe</InputLabel>
                <Select
                  name="bienSoXeId"
                  value={formData.bienSoXeId}
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
                        ) : (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>
                <TextField
                  fullWidth
                  label="Thông tin đối tác vận chuyển"
                  name="doiTacVanChuyen"
                  value={formData.doiTacVanChuyen || ''}
                  onChange={onFormChange}
                  placeholder="Nhập tên và thông tin liên hệ đối tác"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: '40px'
                    }
                  }}
                />
                <IconButton
                  onClick={handleOpenPartnerDialog}
                  sx={{
                    height: '40px',
                    width: '40px',
                    mt: '8px',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    flexShrink: 0,
                    '&:hover': {
                      color: '#374151',
                      backgroundColor: '#f3f4f6',
                      borderColor: '#9ca3af'
                    }
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            <TextField
              fullWidth
              type="number"
              label="Cước vận chuyển"
              name="cuocVanChuyen"
              value={formData.cuocVanChuyen}
              onChange={onFormChange}
              InputProps={{
                inputProps: { min: 0, step: 1000 },
                endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
              }}
              size="small"
            />
          </>
        )}

        {stepIndex === 3 && editingPlan && (
          <>
            {/* Thông tin bổ sung - chỉ khi chỉnh sửa */}
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái</InputLabel>
              <Select
                name="trangThai"
                value={formData.trangThai}
                onChange={onFormChange}
                label="Trạng thái"
              >
                <MenuItem value="Lên lịch">Lên lịch</MenuItem>
                <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
                <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
                <MenuItem value="Hủy">Hủy</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="date"
              label="Ngày hạ hàng"
              name="ngayHaHang"
              value={formData.ngayHaHang}
              onChange={onFormChange}
              InputLabelProps={{ shrink: true }}
              size="small"
            />

            <Box>
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
          </>
        )}
      </Box>
    );
  };


  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '0'
    }}>
      {/* Scrollable Content Area */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        minHeight: '0'
      }}>
        {/* Progress Indicator */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#374151' }}>
              {editingPlan ? 'Chỉnh sửa lịch vận chuyển' : 'Thêm lịch vận chuyển mới'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                backgroundColor: '#f3f4f6',
                px: 2,
                py: 0.5,
                borderRadius: 2,
                border: '1px solid #d1d5db'
              }}>
                <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500, fontSize: '14px' }}>
                  {activeStep + 1}/{steps.length}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: '#6b7280',
                  '&:hover': {
                    color: '#374151',
                    backgroundColor: '#f3f4f6'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={((activeStep + 1) / steps.length) * 100}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#f3f4f6',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: '#6b7280',
              },
            }}
          />
        </Box>



        {/* Error display for the current step, or global form error passed from parent, or data loading error */}
        {(error || dataError) && !shouldShowErrors && ( // Show global error if no step validation errors being shown
           <Alert severity="error" sx={{ mb: 2, borderRadius: 2}}>
             {dataError || error}
           </Alert>
        )}

        {/* Loading indicator for data fetching */}
        {isLoadingData && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={16} />
            Đang tải dữ liệu danh sách...
          </Alert>
        )}

        {/* Current Step Content */}
        <Fade in={true} key={activeStep} timeout={300}>
                      <Card
            variant="outlined"
            sx={{
              mb: 3,
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 2,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <CardContent sx={{ pt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {steps[activeStep].icon}
                <Typography variant="h6" sx={{ ml: 1, fontWeight: 600, color: '#374151' }}>
                  {steps[activeStep].label}
                </Typography>
              </Box>
              {renderStepContent(activeStep)}
              {shouldShowErrors && (
                <Alert
                  severity="error"
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626'
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: '#dc2626' }}>
                    Vui lòng kiểm tra lại:
                  </Typography>
                  {currentStepErrors.map((err, index) => (
                    <Typography key={index} variant="caption" display="block" sx={{ color: '#dc2626' }}>
                      • {err}
                    </Typography>
                  ))}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Fade>
      </Box>

      {/* Fixed Navigation Buttons */}
      <Box sx={{
        flexShrink: 0,
        p: 2,
        pt: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Button
          variant="outlined"
          startIcon={<NavigateBeforeIcon sx={{ fontSize: 16 }} />}
          onClick={handlePrevStep}
          disabled={activeStep === 0 || isLoading}
          sx={{
            minHeight: 36,
            borderRadius: 2,
            width: 90,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            px: 1.5
          }}
        >
          Trước
        </Button>

        <Button
          variant="outlined"
          color="error"
          onClick={onClose}
          disabled={isLoading}
          sx={{
            minHeight: 36,
            borderRadius: 2,
            width: 90,
            fontSize: '14px',
            fontWeight: 500,
            textTransform: 'none',
            px: 1.5,
            borderColor: '#f44336',
            color: '#f44336',
            '&:hover': {
              borderColor: '#d32f2f',
              backgroundColor: 'rgba(244, 67, 54, 0.04)',
            }
          }}
        >
          Hủy
        </Button>

        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 16 }} />}
            onClick={handleSubmit}
            disabled={isLoading}
            sx={{
              minHeight: 36,
              borderRadius: 2,
              width: 90,
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              px: 1.5,
              background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)',
            }}
          >
            {isLoading ? (editingPlan ? 'Sửa' : 'Tạo') : (editingPlan ? 'Sửa' : 'Tạo')}
          </Button>
        ) : (
          <Button
            variant="contained"
            endIcon={<NavigateNextIcon sx={{ fontSize: 16 }} />}
            onClick={handleNextStep}
            disabled={isLoading}
            sx={{
              minHeight: 36,
              borderRadius: 2,
              width: 90,
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              px: 1.5
            }}
          >
            Tiếp
          </Button>
        )}
      </Box>

      {/* Customer Form Dialog */}
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
  onClose: PropTypes.func, // Not strictly required by this component internally for now
  onAddNewCustomer: PropTypes.func, // Function to add new customer (optional)
  onAddNewPartner: PropTypes.func, // Function to add new partner (optional)
};

export default MobileShipmentFormStepper;
