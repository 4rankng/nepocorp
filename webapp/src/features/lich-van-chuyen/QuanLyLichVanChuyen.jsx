import React, { useState, useEffect, useCallback } from 'react';
import {
  getShipmentPlans,
  addShipmentPlan,
  updateShipmentPlan,
  deleteShipmentPlan,
} from '../../services/mockData/shipmentPlans.js';
import { getVehiclesForSelect } from '../../services/mockData/vehicles.js';
import { getPartnersForSelect } from '../../services/mockData/partners.js';
import { getCustomersForSelect } from '../../services/mockData/customers.js';
import { getContainerTypesForSelect } from '../../services/mockData/containers.js';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx';
import ConfirmationModal from '../../components/ConfirmationModal';
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
  Avatar
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
import StandardTable from '../../shared/components/StandardTable';
import { AddButton, EditButton, DeleteButton } from '../../shared/components/ActionButtons';

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
  const [activeStep, setActiveStep] = useState(0);
  const [isFormExpanded, setIsFormExpanded] = useState(!isMobile);

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
  };

  const handleOpenModalForEdit = plan => {
    setEditingPlan(plan);
    setFormData({
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
    });
    setError('');
    setIsModalOpen(true);
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
      setError(err.message || `Lỗi khi ${editingPlan ? 'cập nhật' : 'thêm'} lịch vận chuyển.`);
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
  const handleCardExpand = (planId) => {
    setExpandedCard(expandedCard === planId ? null : planId);
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

  // Filter functions for mobile search
  const filteredPlans = shipmentPlans.filter(plan => {
    const matchesSearch = !searchTerm ||
      plan.dienGiai?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.khachHang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.bienSoXe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.doiTac?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filterStatus || plan.trangThai === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Progressive disclosure form steps
  const getFormSteps = () => [
    {
      label: 'Thông tin cơ bản',
      fields: ['ngayThang', 'dienGiai', 'khachHangId', 'trangThai'],
      icon: <CalendarTodayIcon />
    },
    {
      label: 'Container & Tuyến đường',
      fields: ['soLuongContainer', 'loaiContainerId', 'tuyenDuongDi', 'tuyenDuongDen'],
      icon: <ContainerIcon />
    },
    {
      label: 'Phương tiện & Đối tác',
      fields: ['bienSoXeId', 'doiTacId'],
      icon: <LocalShippingIcon />
    },
    {
      label: 'Chi phí & Container',
      fields: ['cuocVanChuyen', 'cuocThueVanChuyen', 'thongTinContainer', 'ngayHaHang'],
      icon: <AttachMoneyIcon />
    }
  ];

  const getCurrentStepFields = () => {
    const steps = getFormSteps();
    return steps[activeStep]?.fields || [];
  };

  const isStepComplete = (stepIndex) => {
    const steps = getFormSteps();
    const stepFields = steps[stepIndex]?.fields || [];
    return stepFields.every(field => {
      if (field === 'thongTinContainer') {
        return formData.thongTinContainer.every(container =>
          container.soContainer.trim() !== ''
        );
      }
      return formData[field] !== '' && formData[field] !== null && formData[field] !== undefined;
    });
  };

  const getStepValidationErrors = (stepIndex) => {
    const steps = getFormSteps();
    const stepFields = steps[stepIndex]?.fields || [];
    const errors = [];

    stepFields.forEach(field => {
      if (field === 'thongTinContainer') {
        formData.thongTinContainer.forEach((container, index) => {
          if (!container.soContainer.trim()) {
            errors.push(`Số container ${index + 1} không được trống`);
          }
        });
      } else if (!formData[field] || formData[field] === '') {
        errors.push(`${getFieldLabel(field)} không được trống`);
      }
    });

    return errors;
  };

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
      ngayHaHang: 'Ngày hạ hàng'
    };
    return labels[field] || field;
  };

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
      render: value => value || '-',
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeletePlan(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];



    // Mobile Search Header Component
  const MobileSearchHeader = () => (
    <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
      <TextField
        fullWidth
        size="medium"
        placeholder="Tìm kiếm theo diễn giải, khách hàng, biển số xe..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            backgroundColor: 'background.paper',
          },
        }}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
            },
          },
        }}
      />

      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 140, flexGrow: 1 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            label="Trạng thái"
            displayEmpty
          >
            <MenuItem value="">Tất cả</MenuItem>
            <MenuItem value="Lên lịch">Lên lịch</MenuItem>
            <MenuItem value="Đang vận chuyển">Đang vận chuyển</MenuItem>
            <MenuItem value="Hoàn thành">Hoàn thành</MenuItem>
            <MenuItem value="Hủy">Hủy</MenuItem>
          </Select>
        </FormControl>

        <Chip
          label={`${filteredPlans.length} kết quả`}
          size="small"
          variant="outlined"
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main'
          }}
        />
      </Box>
    </Paper>
  );

    // Mobile Shipment Plan Card Component
  const MobileShipmentCard = ({ plan }) => {
    const isExpanded = expandedCard === plan.id;
    const statusColor = getStatusColor(plan.trangThai);

    return (
      <Card
        sx={{
          mb: 2,
          borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          transition: 'all 0.2s ease-in-out',
        }}
      >
        <CardContent sx={{ pb: '16px !important' }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: statusColor,
                width: 40,
                height: 40,
                mr: 2,
                mt: 0.5
              }}
            >
              {plan.trangThai === 'Hoàn thành' ? <CheckCircleIcon /> : <LocalShippingIcon />}
            </Avatar>

            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 600,
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {plan.dienGiai || 'Không có diễn giải'}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={plan.trangThai}
                  size="small"
                  sx={{
                    backgroundColor: statusColor,
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {plan.ngayThang}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BusinessIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {plan.khachHang || 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LocalShippingIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {plan.bienSoXe || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <IconButton
              size="small"
              onClick={() => handleCardExpand(plan.id)}
              sx={{
                mt: 0.5,
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>

          {/* Route Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <LocationOnIcon sx={{ color: 'success.main', mr: 1, fontSize: 18 }} />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              <strong>{plan.tuyenDuong?.diemDi || 'N/A'}</strong>
              {' → '}
              <strong>{
                Array.isArray(plan.tuyenDuong?.diemDen)
                  ? plan.tuyenDuong.diemDen.join(', ')
                  : plan.tuyenDuong?.diemDen || 'N/A'
              }</strong>
            </Typography>
          </Box>

          {/* Expandable Content */}
          <Collapse in={isExpanded} timeout="auto">
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Số lượng container
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {plan.soLuongContainer || 0}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Loại container
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {plan.loaiContainer || 'N/A'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Cước vận chuyển
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {plan.cuocVanChuyen?.toLocaleString('vi-VN') || 0} VNĐ
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Cước thuê vận chuyển
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                  {plan.cuocThueVanChuyen?.toLocaleString('vi-VN') || 0} VNĐ
                </Typography>
              </Box>
            </Box>

            {plan.doiTac && (
              <Box sx={{ mb: 2, p: 1, bgcolor: 'info.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Đối tác vận chuyển
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {plan.doiTac}
                </Typography>
              </Box>
            )}

            {plan.ngayHaHang && (
              <Box sx={{ mb: 2, p: 1, bgcolor: 'warning.50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Ngày hạ hàng
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {plan.ngayHaHang}
                </Typography>
              </Box>
            )}

            {plan.thongTinContainer && plan.thongTinContainer.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Thông tin container
                </Typography>
                {plan.thongTinContainer.map((container, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      p: 1,
                      mb: 1,
                      bgcolor: 'grey.100',
                      borderRadius: 1
                    }}
                  >
                    <Typography variant="body2">
                      <strong>Container:</strong> {container.soContainer || 'N/A'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Seal:</strong> {container.soSeal || 'N/A'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PencilIcon />}
                onClick={() => handleOpenModalForEdit(plan)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  minHeight: 44 // Touch-optimized
                }}
              >
                Sửa
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<TrashIcon />}
                onClick={() => handleDeleteClick(plan)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  minHeight: 44 // Touch-optimized
                }}
              >
                Xóa
              </Button>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Lên lịch': return '#2196f3';
      case 'Đang vận chuyển': return '#ff9800';
      case 'Hoàn thành': return '#4caf50';
      case 'Hủy': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  // Mobile Form Component with Progressive Disclosure
  const MobileFormStepper = () => {
    const steps = getFormSteps();
    const currentStepErrors = getStepValidationErrors(activeStep);

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
            value={(activeStep + 1) / steps.length * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
              }
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
                variant={index === activeStep ? "filled" : "outlined"}
                color={isStepComplete(index) ? "success" : index === activeStep ? "primary" : "default"}
                onClick={() => handleStepClick(index)}
                sx={{
                  minHeight: 40,
                  '& .MuiChip-icon': {
                    fontSize: 18
                  },
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'scale(1.05)'
                  }
                }}
              />
            ))}
          </Box>
        </Box>

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

              {/* Validation Errors */}
              {currentStepErrors.length > 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                    Vui lòng kiểm tra lại:
                  </Typography>
                  {currentStepErrors.map((error, index) => (
                    <Typography key={index} variant="caption" display="block">
                      • {error}
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
            disabled={activeStep === 0}
            sx={{
              minHeight: 48,
              borderRadius: 3,
              flex: 1
            }}
          >
            Quay lại
          </Button>

          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              startIcon={<CheckCircleIcon />}
              onClick={handleSubmit}
              disabled={currentStepErrors.length > 0}
              sx={{
                minHeight: 48,
                borderRadius: 3,
                flex: 2,
                background: 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'
              }}
            >
              {editingPlan ? 'Cập nhật' : 'Tạo lịch'}
            </Button>
          ) : (
            <Button
              variant="contained"
              endIcon={<NavigateNextIcon />}
              onClick={handleNextStep}
              sx={{
                minHeight: 48,
                borderRadius: 3,
                flex: 2
              }}
            >
              Tiếp theo
            </Button>
          )}
        </Box>
      </Box>
    );
  };

  // Render step content based on current step
  const renderStepContent = (stepIndex) => {
    const steps = getFormSteps();
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
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
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
                  onChange={handleInputChange}
                  multiline
                  rows={3}
                  placeholder="Mô tả chi tiết về lịch vận chuyển..."
                />
              );

            case 'khachHangId':
              return (
                <FormControl key={field} fullWidth>
                  <InputLabel>Khách hàng</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
                    label="Khách hàng"
                  >
                    {selectOptions.customers.map(customer => (
                      <MenuItem key={customer.value} value={customer.value}>
                        {customer.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case 'trangThai':
              return (
                <FormControl key={field} fullWidth>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
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
                  onChange={handleInputChange}
                  InputProps={{
                    inputProps: { min: 1, max: 50 }
                  }}
                />
              );

            case 'loaiContainerId':
              return (
                <FormControl key={field} fullWidth>
                  <InputLabel>Loại container</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
                    label="Loại container"
                  >
                    {selectOptions.containerTypes.map(type => (
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
                  onChange={handleInputChange}
                  placeholder="Ví dụ: TP. Hồ Chí Minh"
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
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Hà Nội, Đà Nẵng"
                  helperText="Có thể nhập nhiều điểm đến, cách nhau bằng dấu phẩy"
                />
              );

            case 'bienSoXeId':
              return (
                <FormControl key={field} fullWidth>
                  <InputLabel>Biển số xe</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
                    label="Biển số xe"
                  >
                    {selectOptions.vehicles.map(vehicle => (
                      <MenuItem key={vehicle.value} value={vehicle.value}>
                        {vehicle.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              );

            case 'doiTacId':
              return (
                <FormControl key={field} fullWidth>
                  <InputLabel>Đối tác vận chuyển</InputLabel>
                  <Select
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
                    label="Đối tác vận chuyển"
                  >
                    {selectOptions.partners.map(partner => (
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
                  onChange={handleInputChange}
                  InputProps={{
                    inputProps: { min: 0, step: 1000 },
                    endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
                  }}
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
                  onChange={handleInputChange}
                  InputProps={{
                    inputProps: { min: 0, step: 1000 },
                    endAdornment: <InputAdornment position="end">VNĐ</InputAdornment>
                  }}
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
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                />
              );

            case 'thongTinContainer':
              return (
                <Box key={field}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Thông tin container
                  </Typography>
                  {formData.thongTinContainer.map((container, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2">
                          Container {index + 1}
                        </Typography>
                        {formData.thongTinContainer.length > 1 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeContainerField(index)}
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
                          onChange={(e) => handleContainerInfoChange(index, e)}
                          placeholder="Ví dụ: CONT123456"
                        />
                        <TextField
                          fullWidth
                          label="Số seal"
                          name="soSeal"
                          value={container.soSeal}
                          onChange={(e) => handleContainerInfoChange(index, e)}
                          placeholder="Ví dụ: SEAL789"
                        />
                      </Box>
                    </Card>
                  ))}

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addContainerField}
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

  // Handle form submission for mobile stepper
  const handleSubmit = () => {
    handleSavePlan();
  };

  // Handle delete confirmation for mobile
  const handleDeleteClick = (plan) => {
    handleDeletePlan(plan);
  };

  // Reset form and stepper for mobile
  const resetForm = () => {
    setFormData(initialFormState);
    setActiveStep(0);
    setError('');
  };

  // Enhanced modal handlers for mobile
  const handleOpenModalForAddMobile = () => {
    setEditingPlan(null);
    resetForm();
    setFormData({
      ...initialFormState,
      ngayThang: new Date().toISOString().split('T')[0],
      thongTinContainer: [{ soContainer: '', soSeal: '' }],
    });
    setIsModalOpen(true);
  };

  const handleOpenModalForEditMobile = (plan) => {
    setEditingPlan(plan);
    setFormData({
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
    });
    setActiveStep(0);
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModalMobile = () => {
    setIsModalOpen(false);
    setEditingPlan(null);
    resetForm();
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
          <MobileSearchHeader />

          {/* Loading State */}
          {isLoading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress sx={{ borderRadius: 1 }} />
            </Box>
          )}

          {/* Mobile Cards List */}
          <Box sx={{ mb: 2 }}>
            {filteredPlans.length === 0 ? (
              <Paper sx={{ textAlign: 'center', py: 6, border: '1px dashed', borderColor: 'divider' }}>
                <LocalShippingIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  {searchTerm || filterStatus ? 'Không tìm thấy kết quả' : 'Chưa có lịch vận chuyển nào'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {searchTerm || filterStatus
                    ? 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc'
                    : 'Nhấn nút "Thêm" để tạo lịch vận chuyển mới'
                  }
                </Typography>
              </Paper>
            ) : (
              <Box>
                {filteredPlans.map((plan) => (
                  <MobileShipmentCard key={plan.id} plan={plan} />
                ))}
              </Box>
            )}
          </Box>

          {/* Floating Action Button for Add */}
          <Fab
            color="primary"
            aria-label="add"
            onClick={handleOpenModalForAddMobile}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
              boxShadow: '0 4px 12px rgba(25,118,210,0.3)',
              '&:hover': {
                boxShadow: '0 6px 16px rgba(25,118,210,0.4)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <AddIcon />
          </Fab>
        </Box>
      ) : (
        /* Desktop Layout */
        <Paper elevation={0} sx={{ p: 2 }}>
          <StandardTable
            columns={columns}
            data={shipmentPlans}
            loading={isLoading}
            emptyMessage="Chưa có lịch vận chuyển nào"
            headerAction={<AddButton onClick={handleOpenModalForAdd} size="small" sx={{ ml: 2 }} />}
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
          TransitionProps={{ direction: "up" }}
          sx={{
            '& .MuiDialog-paper': {
              background: 'linear-gradient(180deg, #f5f5f5 0%, #ffffff 20%)'
            }
          }}
        >
          <DialogTitle sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            pb: 1,
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocalShippingIcon sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {editingPlan ? 'Chỉnh sửa' : 'Thêm mới'}
              </Typography>
            </Box>
            <IconButton
              edge="end"
              color="inherit"
              onClick={handleCloseModalMobile}
              aria-label="close"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 2 }}>
            {error && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 2
                }}
              >
                {error}
              </Alert>
            )}

            <MobileFormStepper />
          </DialogContent>
        </Dialog>
      ) : (
        /* Desktop Modal */
        <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
          <form onSubmit={e => {
            e.preventDefault();
            handleSavePlan();
          }}>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box
                  sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}
                >
                  <div>
                    <label htmlFor="ngayThang" className="block text-sm font-medium text-gray-700">
                      Ngày vận chuyển (*)
                    </label>
                    <input
                      type="date"
                      name="ngayThang"
                      id="ngayThang"
                      value={formData.ngayThang}
                      onChange={handleInputChange}
                      className="mt-1 block w-full input-style"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="khachHangId" className="block text-sm font-medium text-gray-700">
                      Khách hàng (*)
                    </label>
                    <select
                      name="khachHangId"
                      id="khachHangId"
                      value={formData.khachHangId}
                      onChange={handleInputChange}
                      className="mt-1 block w-full select-style"
                      required
                    >
                      <option value="">Chọn khách hàng</option>
                      {selectOptions.customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </Box>

                <div>
                  <label htmlFor="dienGiai" className="block text-sm font-medium text-gray-700">
                    Diễn giải (*)
                  </label>
                  <textarea
                    name="dienGiai"
                    id="dienGiai"
                    rows="2"
                    value={formData.dienGiai}
                    onChange={handleInputChange}
                    className="mt-1 block w-full input-style"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="tuyenDuongDi" className="block text-sm font-medium text-gray-700">
                      Điểm đi (*)
                    </label>
                    <input
                      type="text"
                      name="tuyenDuongDi"
                      id="tuyenDuongDi"
                      value={formData.tuyenDuongDi}
                      onChange={handleInputChange}
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tuyenDuongDen"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Điểm đến (cách nhau bởi dấu phẩy) (*)
                    </label>
                    <input
                      type="text"
                      name="tuyenDuongDen"
                      id="tuyenDuongDen"
                      value={formData.tuyenDuongDen}
                      onChange={handleInputChange}
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label
                      htmlFor="soLuongContainer"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Số lượng container
                    </label>
                    <input
                      type="number"
                      name="soLuongContainer"
                      id="soLuongContainer"
                      value={formData.soLuongContainer}
                      onChange={handleInputChange}
                      min="0"
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="loaiContainerId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Loại container (*)
                    </label>
                    <select
                      name="loaiContainerId"
                      id="loaiContainerId"
                      value={formData.loaiContainerId}
                      onChange={handleInputChange}
                      className="mt-1 block w-full select-style"
                    >
                      <option value="">Chọn loại container</option>
                      {selectOptions.containerTypes.map(ct => (
                        <option key={ct.id} value={ct.id}>
                          {ct.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ngayHaHang" className="block text-sm font-medium text-gray-700">
                      Ngày hạ hàng (Nếu có)
                    </label>
                    <input
                      type="date"
                      name="ngayHaHang"
                      id="ngayHaHang"
                      value={formData.ngayHaHang}
                      onChange={handleInputChange}
                      className="mt-1 block w-full input-style"
                    />
                  </div>
                </div>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-sm font-medium text-gray-700 px-1">
                    Thông tin vận chuyển
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                      <label htmlFor="bienSoXeId" className="block text-sm font-medium text-gray-700">
                        Biển số xe (*)
                      </label>
                      <select
                        name="bienSoXeId"
                        id="bienSoXeId"
                        value={formData.bienSoXeId}
                        onChange={handleInputChange}
                        className="mt-1 block w-full select-style"
                      >
                        <option value="">Chọn xe</option>
                        {selectOptions.vehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="cuocVanChuyen"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Cước vận chuyển
                      </label>
                      <input
                        type="number"
                        name="cuocVanChuyen"
                        id="cuocVanChuyen"
                        value={formData.cuocVanChuyen}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 block w-full input-style"
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-sm font-medium text-gray-700 px-1">
                    Thuê vận chuyển (Nếu có)
                  </legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                    <div>
                      <label htmlFor="doiTacId" className="block text-sm font-medium text-gray-700">
                        Đối tác vận chuyển
                      </label>
                      <select
                        name="doiTacId"
                        id="doiTacId"
                        value={formData.doiTacId}
                        onChange={handleInputChange}
                        className="mt-1 block w-full select-style"
                      >
                        <option value="">Chọn đối tác</option>
                        {selectOptions.partners.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="cuocThueVanChuyen"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Cước thuê vận chuyển
                      </label>
                      <input
                        type="number"
                        name="cuocThueVanChuyen"
                        id="cuocThueVanChuyen"
                        value={formData.cuocThueVanChuyen}
                        onChange={handleInputChange}
                        min="0"
                        className="mt-1 block w-full input-style"
                      />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border p-4 rounded-md">
                  <legend className="text-sm font-medium text-gray-700 px-1">
                    Thông tin Container
                  </legend>
                  {formData.thongTinContainer.map((cont, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-2 mb-2"
                    >
                      <input
                        type="text"
                        name="soContainer"
                        value={cont.soContainer}
                        onChange={e => handleContainerInfoChange(index, e)}
                        placeholder={`Số container ${index + 1}`}
                        className="input-style"
                      />
                      <input
                        type="text"
                        name="soSeal"
                        value={cont.soSeal}
                        onChange={e => handleContainerInfoChange(index, e)}
                        placeholder={`Số seal ${index + 1}`}
                        className="input-style"
                      />
                      {formData.thongTinContainer.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeContainerField(index)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addContainerField}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Thêm container
                  </button>
                </fieldset>

                {editingPlan && (
                  <div>
                    <label htmlFor="trangThai" className="block text-sm font-medium text-gray-700">
                      Trạng thái
                    </label>
                    <select
                      name="trangThai"
                      id="trangThai"
                      value={formData.trangThai}
                      onChange={handleInputChange}
                      className="mt-1 block w-full select-style"
                    >
                      <option value="Lên lịch">Lên lịch</option>
                      <option value="Đang chạy">Đang chạy</option>
                      <option value="Hoàn thành">Hoàn thành</option>
                      <option value="Hủy">Hủy</option>
                    </select>
                  </div>
                )}

                </Box>
              </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button
                variant="outlined"
                onClick={handleCloseModal}
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
                {isLoading ? (editingPlan ? 'Đang cập nhật...' : 'Đang lưu...') : 'Lưu'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>
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
