import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext'; // Import useAuth
import { ROLES } from '@/config/roles'; // Import ROLES
import {
  getShipmentPlans,
  addShipmentPlan,
  updateShipmentPlan,
  deleteShipmentPlan,
} from '@services/mockData/shipmentPlans';
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
import StandardTable from '@/components/StandardTable';
import { AddButton, EditButton, DeleteButton } from '@/components/ActionButtons';
import MobileShipmentCard from '@features/lich-van-chuyen/components/MobileShipmentCard'; // Added import
import MobileSearchHeader from '@features/lich-van-chuyen/components/MobileSearchHeader'; // Added import
import DesktopShipmentFormDialog from '@features/lich-van-chuyen/components/DesktopShipmentFormDialog'; // Added import
import MobileShipmentFormStepper from '@features/lich-van-chuyen/components/MobileShipmentFormStepper'; // Added import
import { getStatusColor } from '@features/lich-van-chuyen/utils/styleUtils'; // Added import

const initialFormState = {
  ngayThang: '', // YYYY-MM-DD for input type="date"
  dienGiai: '',
  khachHangId: '',
  soLuongContainer: 1, // Default to 1
  loaiContainerId: '',
  tuyenDuongDi: '',
  tuyenDuongDen: '',
  cuocVanChuyen: 0,
  bienSoXeId: '',
  cuocThueVanChuyen: 0,
  doiTacId: '',
  thongTinContainer: [{ soContainer: '', soSeal: '' }], // Start with one container
  ngayHaHang: '', // YYYY-MM-DD for input type="date"
  trangThai: 'Lên lịch',
  // Fields not directly on form but part of data model, defaults applied in mockData
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

  const { hasAnyRole } = useAuth(); // Get role checker
  const canAddPlan = hasAnyRole([ROLES.QUAN_LY, ROLES.GIAO_NHAN]); // Example: Manager and Dispatcher can add

  const [shipmentPlans, setShipmentPlans] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
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

  // Mobile-specific state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  // const [activeStep, setActiveStep] = useState(0); // No longer needed here
  const [isFormExpanded, setIsFormExpanded] = useState(!isMobile);

  const mapPlanToFormData = plan => {
    if (!plan) return initialFormState;
    return {
      ngayThang: formatDateForInput(plan.ngayThang) || '',
      dienGiai: plan.dienGiai || '',
      khachHangId: plan.khachHangId || '',
      soLuongContainer: plan.soLuongContainer || 1,
      loaiContainerId: plan.loaiContainerId || '',
      tuyenDuongDi: plan.tuyenDuong?.diemDi || '',
      tuyenDuongDen: plan.tuyenDuong?.diemDen
        ? Array.isArray(plan.tuyenDuong.diemDen)
          ? plan.tuyenDuong.diemDen.join(', ')
          : plan.tuyenDuong.diemDen
        : '',
      cuocVanChuyen: plan.cuocVanChuyen || 0,
      bienSoXeId: plan.bienSoXeId || '',
      cuocThueVanChuyen: plan.cuocThueVanChuyen || 0,
      doiTacId: plan.doiTacId || '',
      thongTinContainer:
        plan.thongTinContainer && plan.thongTinContainer.length > 0
          ? plan.thongTinContainer
          : [{ soContainer: '', soSeal: '' }],
      ngayHaHang: formatDateForInput(plan.ngayHaHang) || '',
      trangThai: plan.trangThai || 'Lên lịch',
    };
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
    setFormData({
      ...initialFormState,
      ngayThang: new Date().toISOString().split('T')[0], // Default to today
      thongTinContainer: [{ soContainer: '', soSeal: '' }], // Ensure it's reset
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
    // Basic validation for required fields
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

  // Define table columns
  const columns = [
    {
      key: 'ngayThang',
      label: 'Ngày Tháng',
      render: value => value || '-',
    },
    {
      key: 'bienSoXe',
      label: 'Biển Số Xe',
      render: value => value || '-',
    },
    {
      key: 'tenDoiTac',
      label: 'Đối Tác',
      render: value => value || '-',
    },
    {
      key: 'dienGiai',
      label: 'Diễn Giải',
      render: value => value || '-',
      noWrap: true,
      maxWidth: 300,
    },
    {
      key: 'tuyenDuong',
      label: 'Tuyến Đường',
      render: value => {
        if (!value) return '-';
        if (typeof value === 'object') {
          return `${value.diemDi} - ${Array.isArray(value.diemDen) ? value.diemDen.join(', ') : value.diemDen}`;
        }
        return value;
      },
      noWrap: true,
      maxWidth: 300,
    },
    {
      key: 'trangThai',
      label: 'Trạng Thái',
      render: value => {
        const status = value || '-';
        return (
          <Chip
            label={status}
            size="small"
            sx={{
              backgroundColor: getStatusColor(status),
              color: 'white',
              fontWeight: 500, // Guideline: Use icons alongside text for better visual communication - color helps
            }}
          />
        );
      },
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {canAddPlan && ( // Use the same permission for edit/delete for this example
            <>
              <Tooltip title="Chỉnh sửa">
                <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
              </Tooltip>
              <Tooltip title="Xóa">
                <DeleteButton onClick={() => handleDeletePlan(record)} disabled={isLoading} />
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

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
    // This is effectively the same as handleCloseModal now.
    handleCloseModal();
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
                    onEdit={handleOpenModalForEditMobile}
                    onDelete={handleDeleteClick}
                    canEditDelete={canAddPlan} // Pass permission to card
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Floating Action Button for Add */}
          {canAddPlan && (
            <Fab
              color="primary"
              aria-label="add"
              onClick={handleOpenModalForAddMobile}
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
            columns={columns}
            data={shipmentPlans}
            loading={isLoading}
            emptyMessage="Chưa có lịch vận chuyển nào"
            headerAction={canAddPlan ? <AddButton onClick={handleOpenModalForAdd} size="small" sx={{ ml: 2 }} /> : null}
          />
        </Paper>
      )}

      {/* Mobile Modal with Full Screen Dialog */}
      {isMobile ? (
        <Dialog
          fullScreen
          open={isModalOpen && canAddPlan} // Also check permission to open modal for add/edit
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
                onSave={handleSubmit} // Renamed from handleSavePlan for clarity if needed, or use handleSavePlan directly
                isLoading={isLoading}
                error={error} // Pass the global error state
                selectOptions={selectOptions}
                onClose={handleCloseModalMobile} // Pass close handler
                onAddNewCustomer={handleAddNewCustomer} // Pass the new customer handler
                onAddNewPartner={handleAddNewPartner} // Pass the new partner handler
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
    </Box>
  );
};

export default QuanLyLichVanChuyen;
