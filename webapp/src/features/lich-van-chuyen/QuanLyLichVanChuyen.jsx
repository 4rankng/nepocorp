import React, { useState, useEffect, useCallback } from 'react';
import {
  getShipmentPlans,
  addShipmentPlan,
  updateShipmentPlan,
  deleteShipmentPlan,
  updateShipmentPlanField, // Assuming this will be added to mockData
} from '@services/mockData/shipmentPlans';
import { useAuth } from '@contexts/AuthContext';
import { ROLES } from '@shared/config/roles'; // Added
import { getConfigForRole } from './lichVanChuyenConfig';
import { getVehiclesForSelect } from '@services/mockData/vehicles';
import { getPartnersForSelect, addPartner } from '@services/mockData/partners';
import { getCustomersForSelect, addQuickCustomer } from '@services/mockData/customers';
import { getContainerTypesForSelect } from '@services/mockData/containers';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx';
import ConfirmationModal from '@components/ConfirmationModal';
import {
  Box,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Button,
  Card,
  CardContent,
  Chip,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Collapse,
  Fab,
  LinearProgress,
  InputAdornment,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  Slide,
  Fade,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import BusinessIcon from '@mui/icons-material/Business';
import ContainerIcon from '@mui/icons-material/Inventory2';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import FilterListIcon from '@mui/icons-material/FilterList';
import SortIcon from '@mui/icons-material/Sort';
import StandardTable from '@shared/components/StandardTable';
import { AddButton, EditButton, DeleteButton } from '@shared/components/ActionButtons';
import MobileShipmentCard from '@features/lich-van-chuyen/components/MobileShipmentCard';
import MobileSearchHeader from '@features/lich-van-chuyen/components/MobileSearchHeader';
import DesktopShipmentFormDialog from '@features/lich-van-chuyen/components/DesktopShipmentFormDialog';
import MobileShipmentFormStepper from '@features/lich-van-chuyen/components/MobileShipmentFormStepper';
import DetailedCostsModal from '@features/lich-van-chuyen/components/DetailedCostsModal'; // Added import
import { getStatusColor } from '@features/lich-van-chuyen/utils/styleUtils';

// initialFormState will now be derived based on roleConfig in handleOpenModalForAdd
// However, we can keep a base structure for non-role-specific defaults.
const baseInitialFormState = {
  ngayThang: '',
  dienGiai: '',
  khachHangId: '',
  soLuongContainer: 1,
  loaiContainerId: '', // This might become role-specific or part of a sub-form
  tuyenDuongDi: '', // This is a temporary field for the form
  tuyenDuongDen: '', // This is a temporary field for the form
  cuocVanChuyen: 0, // Likely role-specific (e.g., for QuanLy or GiaoNhan)
  bienSoXeId: '',
  cuocThueVanChuyen: 0, // Likely role-specific
  doiTacId: '',
  thongTinContainer: [{ soContainer: '', soSeal: '' }],
  ngayHaHang: '',
  // trangThai will be set by roleConfig.defaultValues.trangThai
};

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY for display
const formatDateForDisplay = dateStr_YYYYMMDD => {
  if (!dateStr_YYYYMMDD) return '-';
  const [year, month, day] = dateStr_YYYYMMDD.split('-');
  return `${day}/${month}/${year}`;
};

// Helper to format date from DD/MM/YYYY to YYYY-MM-DD for date input
const formatDateForInput = dateStr_DDMMYYYY => {
  if (!dateStr_DDMMYYYY) return '';
  const parts = dateStr_DDMMYYYY.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ''; // Invalid format
};

const QuanLyLichVanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const { currentUser } = useAuth();
  const roleConfig = getConfigForRole(currentUser.role);
  const initialFormState = { // Define initialFormState using roleConfig
    ...baseInitialFormState,
    ...roleConfig.defaultValues,
    ngayThang: roleConfig.defaultValues.ngayThang || new Date().toISOString().split('T')[0], // Ensure date format
    thongTinContainer: roleConfig.defaultValues.thongTinContainer || [{ soContainer: '', soSeal: '' }],
  };


  const [shipmentPlans, setShipmentPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(initialFormState); // Use the new initialFormState
  const [selectOptions, setSelectOptions] = useState({
    vehicles: [],
    partners: [],
    customers: [],
    containerTypes: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);

  // State for DetailedCostsModal
  const [isDetailedCostsModalOpen, setIsDetailedCostsModalOpen] = useState(false);
  const [currentPlanForDetailedCosts, setCurrentPlanForDetailedCosts] = useState(null);

  // State for Inline Editing
  const [editingCell, setEditingCell] = useState(null); // { planId, fieldKey }
  const [editingValue, setEditingValue] = useState('');
  const [inlineEditLoading, setInlineEditLoading] = useState(false);

  // Mobile-specific state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  // const [activeStep, setActiveStep] = useState(0); // No longer needed here
  const [isFormExpanded, setIsFormExpanded] = useState(!isMobile);

  const mapPlanToFormData = plan => {
    if (!plan) return initialFormState; // Use the role-aware initialFormState

    // Create a form data object based on the plan and roleConfig.formFields
    // This ensures that only fields relevant to the current role are mapped.
    const mappedData = { ...initialFormState }; // Start with defaults

    roleConfig.formFields.forEach(field => {
        if (field.name === 'ngayThang' || field.name === 'ngayHaHang') {
            mappedData[field.name] = formatDateForInput(plan[field.name]) || initialFormState[field.name] || '';
        } else if (field.name === 'tuyenDuongDi') {
            mappedData.tuyenDuongDi = plan.tuyenDuong?.diemDi || initialFormState.tuyenDuongDi || '';
        } else if (field.name === 'tuyenDuongDen') {
            mappedData.tuyenDuongDen = plan.tuyenDuong?.diemDen
                ? Array.isArray(plan.tuyenDuong.diemDen)
                    ? plan.tuyenDuong.diemDen.join(', ')
                    : plan.tuyenDuong.diemDen
                : initialFormState.tuyenDuongDen || '';
        } else if (field.name === 'thongTinContainer') {
            mappedData.thongTinContainer =
                plan.thongTinContainer && plan.thongTinContainer.length > 0
                    ? plan.thongTinContainer
                    : initialFormState.thongTinContainer || [{ soContainer: '', soSeal: '' }];
        } else if (plan.hasOwnProperty(field.name)) {
            mappedData[field.name] = plan[field.name] ?? initialFormState[field.name] ?? '';
        } else {
            // If the field is not in the plan, use the default from initialFormState (which includes roleConfig.defaultValues)
            mappedData[field.name] = initialFormState[field.name] ?? '';
        }
    });
    // Ensure trangThai from plan is prioritized if available
    mappedData.trangThai = plan.trangThai || initialFormState.trangThai;
    return mappedData;
  };

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [plans, vehicles, partners, customers, containerTypes] = await Promise.all([
        getShipmentPlans(),
        getVehiclesForSelect(),
        getPartnersForSelect(),
        getCustomersForSelect(),
        getContainerTypesForSelect(),
      ]);
      setShipmentPlans(plans);
      setSelectOptions({ vehicles, partners, customers, containerTypes });
    } catch (err) {
      setError('Không thể tải dữ liệu cần thiết cho trang.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleContainerInfoChange = (index, e) => {
    const { name, value } = e.target;
    const updatedContainers = formData.thongTinContainer.map((item, i) =>
      i === index ? { ...item, [name]: value } : item
    );
    setFormData(prev => ({ ...prev, thongTinContainer: updatedContainers }));
  };

  const addContainerField = () => {
    setFormData(prev => ({
      ...prev,
      thongTinContainer: [...prev.thongTinContainer, { soContainer: '', soSeal: '' }],
    }));
  };

  const removeContainerField = index => {
    if (formData.thongTinContainer.length > 1) {
      // Keep at least one
      setFormData(prev => ({
        ...prev,
        thongTinContainer: prev.thongTinContainer.filter((_, i) => i !== index),
      }));
    }
  };

  const handleOpenModalForAdd = () => {
    setEditingPlan(null);
    // Set formData using roleConfig.defaultValues
    setFormData({
      ...baseInitialFormState, // Base defaults
      ...roleConfig.defaultValues, // Role-specific defaults (e.g., trangThai)
      ngayThang: roleConfig.defaultValues.ngayThang || new Date().toISOString().split('T')[0], // Ensure date format
      thongTinContainer: roleConfig.defaultValues.thongTinContainer || [{ soContainer: '', soSeal: '' }], // Ensure it's reset
    });
    setError('');
    setIsModalOpen(true);
    // MobileShipmentFormStepper will reset its own activeStep due to editingPlan changing
  };

  const handleOpenModalForEdit = plan => {
    setEditingPlan(plan);
    setFormData(mapPlanToFormData(plan));
    setError('');
    setIsModalOpen(true);
    // MobileShipmentFormStepper will reset its own activeStep due to editingPlan changing
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    setFormData(initialFormState);
    setError('');
  };

  // Handle ESC key press to close modals
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (isModalOpen) {
          handleCloseModal();
        } else if (isDeleteModalOpen) {
          handleDeleteCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, isDeleteModalOpen]);

  const handleSavePlan = async () => {
    setError('');

    // Additional validation for Kế toán completing a shipment
    if (currentUser.role === ROLES.KE_TOAN && formData.trangThai === 'Hoàn thành') {
      if (!formData.ngayHaHang || formData.ngayHaHang.trim() === '') {
        setError('Ngày hạ hàng là bắt buộc khi cập nhật trạng thái là "Hoàn thành".');
        return; // Prevent saving
      }
    }

    // Basic validation for required fields (example, adjust as per actual required fields from config)
    // This existing validation might need to be made more dynamic based on roleConfig.formFields[*].required
    if (
      !formData.ngayThang ||
      !formData.dienGiai.trim() ||
      !formData.khachHangId ||
      !formData.loaiContainerId ||
      !formData.bienSoXeId ||
      !formData.tuyenDuongDi.trim() ||
      !formData.tuyenDuongDen.trim()
    ) {
      setError(
        'Vui lòng điền đầy đủ các trường bắt buộc: Ngày, Diễn giải, Khách hàng, Loại cont, Biển số xe, Tuyến đường.'
      );
      return;
    }

    setIsLoading(true);
    const planData = {
      ...formData,
      ngayThang: formatDateForDisplay(formData.ngayThang), // Convert to DD/MM/YYYY for mock
      ngayHaHang: formData.ngayHaHang ? formatDateForDisplay(formData.ngayHaHang) : '-', // Convert to DD/MM/YYYY for mock
      tuyenDuong: {
        diemDi: formData.tuyenDuongDi.trim() || '-',
        diemDen: formData.tuyenDuongDen
          .split(',')
          .map(s => s.trim())
          .filter(s => s) || ['-'],
      },
      soLuongContainer: parseInt(formData.soLuongContainer, 10) || 0,
      cuocVanChuyen: parseFloat(formData.cuocVanChuyen) || 0,
      cuocThueVanChuyen: parseFloat(formData.cuocThueVanChuyen) || 0,
      // Ensure default for optional fields if empty
      doiTacId: formData.doiTacId || '-',
      thongTinContainer: formData.thongTinContainer
        .map(c => ({
          soContainer: c.soContainer.trim() || '-',
          soSeal: c.soSeal.trim() || '-',
        }))
        .filter(c => c.soContainer !== '-' || c.soSeal !== '-'), // Filter out empty entries
    };

    // Remove temporary form fields not in the main data model
    delete planData.tuyenDuongDi;
    delete planData.tuyenDuongDen;

    try {
      if (editingPlan) {
        await updateShipmentPlan(editingPlan.id, planData);
      } else {
        await addShipmentPlan(planData);
      }
      await fetchPageData(); // Refresh list and select options
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${editingPlan ? 'sửa' : 'thêm'} lịch vận chuyển.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePlan = async plan => {
    setPlanToDelete(plan);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;

    setIsLoading(true);
    setError('');
    try {
      await deleteShipmentPlan(planToDelete.id);
      await fetchPageData(); // Refresh list
      setIsDeleteModalOpen(false);
      setPlanToDelete(null);
    } catch (err) {
      setError('Lỗi khi xóa lịch vận chuyển.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setPlanToDelete(null);
  };

  const getEntityNameById = (id, list, keyField = 'id', nameField = 'name') => {
    const entity = list.find(item => item[keyField] === id);
    return entity ? entity[nameField] : '-';
  };

  // Mobile-specific handlers
  const handleCardExpand = planId => {
    setExpandedCard(expandedCard === planId ? null : planId);
  };

  // handleNextStep, handlePrevStep, handleStepClick are no longer needed here
  // as MobileShipmentFormStepper will manage its own activeStep.

  // Filter functions for mobile search
  const filteredPlans = shipmentPlans.filter(plan => {
    const matchesSearch =
      !searchTerm ||
      plan.dienGiai?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.khachHang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.bienSoXe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.doiTac?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || plan.trangThai === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // getFormSteps, getCurrentStepFields, isStepComplete, getStepValidationErrors, getFieldLabel
  // are all moved to MobileShipmentFormStepper.jsx

  const handleTriggerInlineEdit = (plan, fieldKey) => {
    setEditingCell({ planId: plan.id, fieldKey });
    const currentValue = plan[fieldKey];
    setEditingValue(currentValue !== undefined && currentValue !== null ? String(currentValue) : '');
  };

  const handleInlineEditSave = async (planId, fieldKey, newValueString, columnType) => {
    setInlineEditLoading(true);
    setError(''); // Clear previous errors

    let processedValue = newValueString;
    if (columnType === 'number') {
      processedValue = parseFloat(newValueString);
      if (isNaN(processedValue)) {
        setError(`Giá trị nhập cho ${fieldKey} không hợp lệ.`);
        setInlineEditLoading(false);
        setEditingCell(null); // Exit editing mode on error
        return;
      }
    }

    try {
      // await updateShipmentPlanField(planId, fieldKey, processedValue); // Actual API call
      // Mock implementation for now:
      console.log(`Mock saving: planId=${planId}, fieldKey=${fieldKey}, value=${processedValue}`);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local data to reflect change immediately for better UX
      setShipmentPlans(prevPlans =>
        prevPlans.map(p =>
          p.id === planId ? { ...p, [fieldKey]: processedValue } : p
        )
      );
      // If this save affects other calculated fields (like chiPhiDauThanhTien),
      // you might need to re-fetch the specific plan or the whole list.
      // For now, just updating the field that was edited.
      // await fetchPageData(); // Or fetch just the updated plan

    } catch (err) {
      console.error('Error updating shipment plan field:', err);
      setError(`Lỗi khi cập nhật ${fieldKey}: ${err.message}`);
      // Optionally, revert optimistic update if API call fails, or refetch data
    } finally {
      setEditingCell(null);
      setInlineEditLoading(false);
    }
  };


  // Define table columns based on roleConfig
  const columns = roleConfig.tableColumns.map(colConfig => {
    // Actions column
    if (colConfig.key === 'actions') {
      return {
        ...colConfig,
        render: (_, record) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}> {/* Reduced gap for more buttons */}
            {roleConfig.actions?.includes('edit') && roleConfig.permissions.canEdit && (
              <Tooltip title="Sửa Toàn Bộ">
                <IconButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading || inlineEditLoading} size="small">
                   <PencilIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {roleConfig.actions?.includes('manageDetailedCosts') && (
              <Tooltip title="Chi Phí Khác">
                <IconButton onClick={() => handleOpenDetailedCostsModal(record)} size="small" disabled={isLoading || inlineEditLoading}>
                  <AttachMoneyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {roleConfig.actions?.includes('delete') && roleConfig.permissions.canDelete && (
              <Tooltip title="Xóa">
                 <IconButton onClick={() => handleDeletePlan(record)} disabled={isLoading || inlineEditLoading} size="small" color="error">
                    <TrashIcon fontSize="small" />
                 </IconButton>
              </Tooltip>
            )}
          </Box>
        ),
      };
    }

    // Inline editable columns for Kế toán
    if (currentUser.role === ROLES.KE_TOAN && colConfig.editable) {
      return {
        ...colConfig,
        render: (value, row) => {
          const isEditingThisCell = editingCell?.planId === row.id && editingCell?.fieldKey === colConfig.key;
          if (isEditingThisCell) {
            return (
              <TextField
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                size="small"
                autoFocus
                type={colConfig.type || 'text'} // Use number type for number fields
                InputProps={{
                  sx: { fontSize: '0.875rem', padding: '6px 8px', height: '36px' }, // Compact input
                  endAdornment: inlineEditLoading ? <CircularProgress size={15} sx={{mr:1}} /> : null,
                }}
                sx={{ minWidth: '100px', maxWidth: '150px' }} // Prevent overly wide input
                onBlur={() => {
                  // Only save if not loading to prevent double submission if Enter was pressed
                  if (!inlineEditLoading) {
                     handleInlineEditSave(row.id, colConfig.key, editingValue, colConfig.type);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!inlineEditLoading) {
                        handleInlineEditSave(row.id, colConfig.key, editingValue, colConfig.type);
                    }
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setEditingCell(null);
                  }
                }}
                disabled={inlineEditLoading}
              />
            );
          }
          // Display value (clickable)
          const displayValue = colConfig.render ? colConfig.render(row[colConfig.key], row) : (row[colConfig.key] ?? '-');
          return (
            <Box
              onClick={() => !inlineEditLoading && handleTriggerInlineEdit(row, colConfig.key)}
              sx={{ 
                cursor: 'pointer', 
                minHeight: '24px', 
                width: '100%', 
                py: '6px', // Match TextField padding for alignment
                px: '8px',
                borderRadius: 1, // Slight rounding
                '&:hover': { backgroundColor: 'action.hover' } 
              }}
            >
              {displayValue}
            </Box>
          );
        },
      };
    }
    
    // Default column rendering (non-editable or for other roles)
    if (colConfig.render) {
        return {
            ...colConfig, // Spread the original config first
            render: (value, item) => colConfig.render(item[colConfig.key], item),
        };
    }
    return {
      ...colConfig, // Spread the original config
      render: value => value || '-',
    };
  });


  // MobileFormStepper and its related functions (renderStepContent, getFormSteps, etc.)
  // are now moved to MobileShipmentFormStepper.jsx

  // Handle form submission for mobile stepper
  // This handleSubmit is called by MobileShipmentFormStepper via onSave prop
  const handleSubmit = () => {
    // This name is a bit generic, but it's what MobileFormStepper used.
    handleSavePlan();
  };

  // Handle delete confirmation for mobile
  const handleDeleteClick = plan => {
    handleDeletePlan(plan);
  };

  // Reset form and stepper for mobile
  const resetForm = () => {
    setFormData(initialFormState);
    setError('');
  };

  // Handle adding new customer from stepper
  const handleAddNewCustomer = async customerName => {
    try {
      const newCustomer = await addQuickCustomer(customerName);

      // Refresh customer list
      const updatedCustomers = await getCustomersForSelect();
      setSelectOptions(prev => ({
        ...prev,
        customers: updatedCustomers.map(c => ({ value: c.id, label: c.name })),
      }));

      return newCustomer.id; // Return new customer ID to select it
    } catch (error) {
      throw error; // Let child component handle the error
    }
  };

  // Handle adding new partner from stepper
  const handleAddNewPartner = async partnerName => {
    try {
      // Create partner data for quick add
      const partnerData = {
        code:
          partnerName
            .split(' ')
            .map(word => word.charAt(0).toUpperCase())
            .join('')
            .slice(0, 10) || 'DT',
        name: partnerName.trim(),
        address: 'Chưa cập nhật',
        taxCode: 'Chưa cập nhật',
      };

      const newPartner = await addPartner(partnerData);

      // Refresh partner list
      const updatedPartners = await getPartnersForSelect();
      setSelectOptions(prev => ({
        ...prev,
        partners: updatedPartners.map(p => ({ value: p.id, label: p.name })),
      }));

      return newPartner.id; // Return new partner ID to select it
    } catch (error) {
      throw error; // Let child component handle the error
    }
  };

  // Enhanced modal handlers for mobile - Now they can just call the consolidated ones.
  const handleOpenModalForAddMobile = () => {
    // This is effectively the same as handleOpenModalForAdd now.
    // If MobileShipmentFormStepper needs specific logic for reset, that's internal to it.
    handleOpenModalForAdd();
  };

  const handleOpenModalForEditMobile = plan => {
    // This is effectively the same as handleOpenModalForEdit now.
    handleOpenModalForEdit(plan);
  };

  const handleCloseModalMobile = () => {
    handleCloseModal();
  };

  // Handler for opening the detailed costs modal
  const handleOpenDetailedCostsModal = (plan) => {
    setCurrentPlanForDetailedCosts(plan);
    setIsDetailedCostsModalOpen(true);
  };

  // Handler for when detailed costs are saved successfully
  const handleDetailedCostsSaveSuccess = () => {
    fetchPageData(); // Refresh the main list to show updated sums or other data
    // No need to close modal here as it's handled by the modal itself or via onClose prop if needed for other scenarios
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* Page Title */}
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Quản lý lịch vận chuyển
      </Typography>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Mobile Layout */}
      {isMobile ? (
        <Box>
          {/* Mobile Search Header */}
          <MobileSearchHeader
            searchTerm={searchTerm}
            onSearchTermChange={e => setSearchTerm(e.target.value)}
            filterStatus={filterStatus}
            onFilterStatusChange={e => setFilterStatus(e.target.value)}
            resultCount={filteredPlans.length}
          />

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
          )}

          {/* Mobile Cards List */}
          <Box sx={{ mb: 2 }}>
            {filteredPlans.length === 0 ? (
              <Paper
                sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider' }}
              >
                <LocalShippingIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {searchTerm || filterStatus
                    ? 'Không tìm thấy kết quả'
                    : 'Chưa có lịch vận chuyển nào'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || filterStatus
                    ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'
                    : 'Nhấn nút "Thêm" để tạo lịch vận chuyển mới'}
                </Typography>
              </Paper>
            ) : (
              <Box>
                {filteredPlans.map(plan => (
                  <MobileShipmentCard
                    key={plan.id}
                    plan={plan}
                    isExpanded={expandedCard === plan.id}
                    onCardExpand={handleCardExpand}
                    onEdit={handleOpenModalForEditMobile} // Ensure this handler is adapted if needed
                    onDelete={handleDeleteClick} // Ensure this handler is adapted if needed
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Floating Action Button for Add */}
          {/* Floating Action Button for Add - Conditionally render based on role permission */}
          {roleConfig.permissions.canAdd && (
          <Fab
            color="primary"
            aria-label="add"
            onClick={handleOpenModalForAddMobile} // This now uses roleConfig.defaultValues
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              boxShadow: 3, // Use theme shadow value instead of custom
              '&:hover': {
                boxShadow: 6, // Use theme shadow value instead of custom
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <AddIcon />
          </Fab>
          )}
        </Box>
      ) : (
        /* Desktop Layout */
        <Paper elevation={0} sx={{ p: 2 }}>
          <StandardTable
            columns={columns} // Use dynamically generated columns
            data={shipmentPlans}
            loading={isLoading}
            emptyMessage="Chưa có lịch vận chuyển nào"
            // Conditionally render AddButton based on role permission
            headerAction={
              roleConfig.permissions.canAdd ? (
                <AddButton onClick={handleOpenModalForAdd} size="small" sx={{ ml: 2 }} />
              ) : null
            }
          />
        </Paper>
      )}

      {/* Mobile Modal with Full Screen Dialog */}
      {isMobile ? (
        <Dialog
          fullScreen
          open={isModalOpen}
          onClose={handleCloseModalMobile}
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
          sx={{
            '& .MuiDialog-paper': {
              background: '#ffffff',
            },
          }}
        >
          <DialogContent
            sx={{
              p: 2,
              pb: 0,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                pr: 1,
                mr: -1,
                pb: 2,
              }}
            >
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 2,
                    borderRadius: 2,
                  }}
                >
                  {error}
                </Alert>
              )}

              <MobileShipmentFormStepper
                editingPlan={editingPlan}
                formData={formData}
                onFormChange={handleInputChange}
                onContainerFormChange={handleContainerInfoChange}
                onAddContainerField={addContainerField}
                onRemoveContainerField={removeContainerField}
                onSave={handleSubmit}
                isLoading={isLoading}
                error={error}
                selectOptions={selectOptions}
                onClose={handleCloseModalMobile}
                onAddNewCustomer={handleAddNewCustomer}
                onAddNewPartner={handleAddNewPartner}
                roleConfig={roleConfig} // Pass roleConfig
              />
            </Box>
          </DialogContent>
        </Dialog>
      ) : (
        <DesktopShipmentFormDialog
          open={isModalOpen}
          onClose={handleCloseModal}
          editingPlan={editingPlan}
          formData={formData}
          onFormChange={handleInputChange}
          onContainerFormChange={handleContainerInfoChange}
          onAddContainerField={addContainerField}
          onRemoveContainerField={removeContainerField}
          onSave={handleSavePlan}
          isLoading={isLoading}
          error={error}
          selectOptions={selectOptions}
          roleConfig={roleConfig} // Pass roleConfig
        />
      )}

      {/* Confirmation Modal for both mobile and desktop */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa lịch vận chuyển này?
            </Typography>
            <Box sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Ngày:</strong> {planToDelete?.ngayThang}
              </Typography>
              <Typography variant="body2">
                <strong>Biển số xe:</strong> {planToDelete?.bienSoXe}
              </Typography>
              <Typography variant="body2">
                <strong>Đối tác:</strong> {planToDelete?.tenDoiTac || '-'}
              </Typography>
            </Box>
          </Box>
        }
      />

      {/* Detailed Costs Modal */}
      {currentPlanForDetailedCosts && (
        <DetailedCostsModal
          open={isDetailedCostsModalOpen}
          onClose={() => setIsDetailedCostsModalOpen(false)}
          planId={currentPlanForDetailedCosts.id}
          initialCosts={currentPlanForDetailedCosts.detailedOtherCosts || []} // Ensure initialCosts is always an array
          onSaveSuccess={handleDetailedCostsSaveSuccess}
        />
      )}
    </Box>
  );
};

export default QuanLyLichVanChuyen;
