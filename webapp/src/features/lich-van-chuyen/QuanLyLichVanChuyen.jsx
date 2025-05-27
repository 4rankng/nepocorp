import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext'; // Import useAuth
import { ROLES } from '@/config/roles'; // Import ROLES
import {
  fetchAllLichVanChuyen,
  addLichVanChuyen,
  editLichVanChuyen,
  removeLichVanChuyen,
  // fetchLichVanChuyenById, // Placeholder if needed later
  fetchAllNhanVien, // Updated to use API function
  fetchAllContainer, // Updated to use API function
  fetchAllKhachHang, // Added for customer API
  addKhachHang, // Added for customer creation
  fetchAllDauKeo, // Added for vehicles
  fetchAllRoMooc, // Added for vehicles
} from '@services/mockApi/index.js';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx';
import ConfirmationModal from '@components/ConfirmationModal';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
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
  Slide,
  Fade,
  Tooltip,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { EditButton, DeleteButton } from '@/components/ActionButtons';
import MobileView from '@features/lich-van-chuyen/components/MobileView';
import DesktopView from '@features/lich-van-chuyen/components/DesktopView';
import DesktopShipmentFormDialog from '@features/lich-van-chuyen/components/DesktopShipmentFormDialog';
import MobileShipmentFormStepper from '@features/lich-van-chuyen/components/MobileShipmentFormStepper';
import { getStatusColor } from '@features/lich-van-chuyen/utils/styleUtils';

const initialFormState = {
  ma_chuyen: '',
  ngay_van_chuyen: new Date().toISOString().split('T')[0],
  trang_thai: 'chua_thuc_hien',
  khach_hang_id: '',
  diem_xuat_phat: '',
  diem_tra_hang: '',
  bien_so_xe_id: '',
  container_id: '',
  nhan_vien_giao_nhan_id: '',
  nhan_vien_lai_xe_id: '',
  ghi_chu: '',
  // Note: This structure is based on the lichVanChuyenApi.
  // UI forms will need significant updates to match these fields.
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

// Helper to format vehicles data for select options
const formatVehiclesForSelect = (dauKeoList, roMoocList) => {
  const vehicles = [];

  // Add tractors (đầu kéo)
  dauKeoList.forEach(item => {
    vehicles.push({
      value: item.id,
      label: `${item.bien_so} (${item.mo_ta})`,
      type: 'dau_keo',
    });
  });

  // Add trailers (rơ moóc)
  roMoocList.forEach(item => {
    vehicles.push({
      value: item.id,
      label: `${item.bien_so} (${item.mo_ta})`,
      type: 'ro_mooc',
    });
  });

  return vehicles;
};

// Helper to format customers data for select options
const formatCustomersForSelect = customersList => {
  return customersList.map(customer => ({
    value: customer.id,
    label: customer.ten,
    ma_dinh_danh: customer.ma_dinh_danh,
  }));
};

// Helper to format employees data for select options
const formatEmployeesForSelect = employeesList => {
  return employeesList.map(employee => ({
    value: employee.id,
    label: `${employee.ho_ten} (${employee.ma_so})`,
    chuc_vu: employee.chuc_vu,
  }));
};

// Helper to format containers data for select options
const formatContainersForSelect = containersList => {
  return containersList.map(container => ({
    value: container.id,
    label: container.id,
  }));
};

// Helper function to add a new customer quickly
const addQuickCustomer = async customerName => {
  if (!customerName || customerName.trim() === '') {
    throw new Error('Tên khách hàng không được để trống');
  }

  const newCustomerData = {
    ma_dinh_danh: `MDD${Date.now()}`, // Generate unique identifier
    ten: customerName.trim(),
    dia_chi: '', // Default empty address
    ma_so_thue: '', // Default empty tax code
  };

  const newCustomer = await addKhachHang(newCustomerData);
  return newCustomer;
};

const QuanLyLichVanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  const { hasAnyRole } = useAuth(); // Get role checker
  const canAddPlan = hasAnyRole([ROLES.QUAN_LY, ROLES.GIAO_NHAN]); // Example: Manager and Dispatcher can add

  const [lichVanChuyenItems, setLichVanChuyenItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [selectOptions, setSelectOptions] = useState({
    vehicles: [],
    customers: [],
    employees: [], // Added for employee dropdown
    containers: [], // Changed from containerTypes to containers
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Mobile-specific state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [isFormExpanded, setIsFormExpanded] = useState(!isMobile);

  const mapLichVanChuyenToFormData = item => {
    if (!item) return initialFormState;
    return {
      id: item.id || '', // Keep id for editing
      ma_chuyen: item.ma_chuyen || '',
      ngay_van_chuyen: item.ngay_van_chuyen || '', // Already YYYY-MM-DD from API
      trang_thai: item.trang_thai || 'chua_thuc_hien',
      khach_hang_id: item.khach_hang_id || '',
      diem_xuat_phat: item.diem_xuat_phat || '',
      diem_tra_hang: item.diem_tra_hang || '',
      bien_so_xe_id: item.bien_so_xe_id || '',
      container_id: item.container_id || '',
      nhan_vien_giao_nhan_id: item.nhan_vien_giao_nhan_id || '',
      nhan_vien_lai_xe_id: item.nhan_vien_lai_xe_id || '',
      ghi_chu: item.ghi_chu || '',
    };
  };

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [
        lichVanChuyenList,
        dauKeoList,
        roMoocList,
        customersList,
        employeesList,
        containersList,
      ] = await Promise.all([
        fetchAllLichVanChuyen(),
        fetchAllDauKeo(),
        fetchAllRoMooc(),
        fetchAllKhachHang(),
        fetchAllNhanVien(),
        fetchAllContainer(),
      ]);

      const vehiclesData = formatVehiclesForSelect(dauKeoList, roMoocList);
      const customersData = formatCustomersForSelect(customersList);
      const employeesData = formatEmployeesForSelect(employeesList);
      const containersData = formatContainersForSelect(containersList);

      setLichVanChuyenItems(lichVanChuyenList);
      setSelectOptions({
        vehicles: vehiclesData,
        customers: customersData,
        employees: employeesData,
        containers: containersData,
      });
    } catch (err) {
      setError('Không thể tải dữ liệu Lịch Vận Chuyển.');
      console.error('Error fetching page data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Removed setLichVanChuyenItems from dependency array as fetchAllLichVanChuyen is stable

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleOpenModalForAdd = () => {
    setEditingItem(null);
    setFormData({
      ...initialFormState,
      ngay_van_chuyen: new Date().toISOString().split('T')[0], // Default to today, already in initialFormState
    });
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = item => {
    setEditingItem(item);
    setFormData(mapLichVanChuyenToFormData(item));
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
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

  const handleSave = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Basic validation for new structure (example)
      if (
        !formData.ma_chuyen ||
        !formData.ngay_van_chuyen ||
        !formData.khach_hang_id ||
        !formData.trang_thai
      ) {
        setError('Mã chuyến, Ngày vận chuyển, Khách hàng, và Trạng thái là bắt buộc.');
        setIsLoading(false);
        return;
      }

      // formData should already be in the correct structure for lichVanChuyenApi
      // as initialFormState and mapLichVanChuyenToFormData are aligned.
      // No complex transformation needed here if UI forms directly map to formData fields.
      // However, UI forms (DesktopShipmentFormDialog, MobileShipmentFormStepper) will need significant updates.

      if (editingItem) {
        await editLichVanChuyen(editingItem.id, formData);
      } else {
        await addLichVanChuyen(formData);
      }
      fetchPageData(); // Refresh data
      setIsModalOpen(false);
      setEditingItem(null); // Clear editing item
      setFormData(initialFormState); // Reset form
    } catch (err) {
      setError(`Lỗi khi lưu lịch vận chuyển: ${err.message}`);
      console.error('Error saving LichVanChuyen:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = item => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      setIsLoading(true);
      setError('');
      try {
        await removeLichVanChuyen(itemToDelete.id);
        fetchPageData(); // Refresh data
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
      } catch (err) {
        setError(`Lỗi khi xóa lịch vận chuyển: ${err.message}`);
        console.error('Error deleting LichVanChuyen:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const getEntityNameById = (id, list, keyField = 'id', nameField = 'name') => {
    const entity = list.find(item => item[keyField] === id);
    return entity ? entity[nameField] : '-';
  };

  // Mobile-specific handlers
  const handleCardExpand = planId => {
    setExpandedCard(expandedCard === planId ? null : planId);
  };

  // Filter functions for mobile search
  const filteredLichVanChuyenItems = lichVanChuyenItems.filter(item => {
    const matchesSearch =
      !searchTerm ||
      item.ma_chuyen.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.ghi_chu && item.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = !filterStatus || item.trang_thai === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // Handle form submission for mobile stepper
  // This handleSubmit is called by MobileShipmentFormStepper via onSave prop
  const handleSubmit = () => {
    handleSave();
  };

  // Define table columns for DesktopView
  const columns = [
    {
      key: 'ngay_van_chuyen',
      label: 'Ngày Vận Chuyển',
      render: value => formatDateForDisplay(value) || '-',
    },
    {
      key: 'ma_chuyen',
      label: 'Mã Chuyến',
      render: value => value || '-',
    },
    {
      key: 'khach_hang_id',
      label: 'Khách Hàng',
      render: value => getEntityNameById(value, selectOptions.customers, 'value', 'label') || '-',
    },
    {
      key: 'bien_so_xe_id',
      label: 'Biển Số Xe',
      render: value => getEntityNameById(value, selectOptions.vehicles, 'value', 'label') || '-',
    },
    {
      key: 'container_id',
      label: 'Số Container',
      render: value => getEntityNameById(value, selectOptions.containers, 'value', 'label') || '-',
    },
    {
      key: 'diem_xuat_phat',
      label: 'Điểm Xuất Phát',
      render: value => value || '-',
    },
    {
      key: 'diem_tra_hang',
      label: 'Điểm Trả Hàng',
      render: value => value || '-',
    },
    {
      key: 'trang_thai',
      label: 'Trạng Thái',
      render: value => {
        const status = value || '-';
        return (
          <Chip
            label={status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} // Format status display
            size="small"
            sx={{
              backgroundColor: getStatusColor(status),
              color: 'white',
              fontWeight: 500,
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
          {canAddPlan && (
            <>
              <Tooltip title="Chỉnh sửa">
                <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
              </Tooltip>
              <Tooltip title="Xóa">
                <DeleteButton onClick={() => handleDelete(record)} disabled={isLoading} />
              </Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  // Handle delete confirmation for mobile
  const handleDeleteClick = plan => {
    handleDelete(plan);
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
      const updatedCustomers = await fetchAllKhachHang();
      const formattedCustomers = formatCustomersForSelect(updatedCustomers);
      setSelectOptions(prev => ({
        ...prev,
        customers: formattedCustomers,
      }));

      return newCustomer.id; // Return new customer ID to select it
    } catch (error) {
      throw error; // Let child component handle the error
    }
  };

  // Enhanced modal handlers for mobile - Now they can just call the consolidated ones.
  const handleOpenModalForAddMobile = () => {
    handleOpenModalForAdd();
  };

  const handleOpenModalForEditMobile = plan => {
    handleOpenModalForEdit(plan);
  };

  const handleCloseModalMobile = () => {
    handleCloseModal();
  };

  return (
    <Box
      sx={{
        p: isMobile ? 2 : 3,
        pt: isMobile ? 2 : 3,
        backgroundColor: theme.palette.background.default,
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        gutterBottom
        sx={{
          fontWeight: 600,
          color: theme.palette.primary.main,
          mb: isMobile ? 2 : 3,
        }}
      >
        Quản Lý Lịch Vận Chuyển
      </Typography>

      {isLoading && !isModalOpen && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}

      {error && !isModalOpen && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: 2,
            boxShadow: theme.shadows[2],
          }}
        >
          {error}
        </Alert>
      )}

      {isMobile ? (
        <MobileView
          searchTerm={searchTerm}
          onSearchTermChange={e => setSearchTerm(e.target.value)}
          filterStatus={filterStatus}
          onFilterStatusChange={e => setFilterStatus(e.target.value)}
          items={filteredLichVanChuyenItems}
          isLoading={isLoading}
          expandedCard={expandedCard}
          onCardExpand={handleCardExpand}
          onEditItem={handleOpenModalForEditMobile}
          onDeleteItem={handleDeleteClick}
          onAdd={handleOpenModalForAddMobile}
          canAddPlan={canAddPlan} // Assuming canAddPlan is still relevant for add button visibility
        />
      ) : (
        <DesktopView
          searchTerm={searchTerm}
          onSearchTermChange={e => setSearchTerm(e.target.value)}
          columns={columns} // columns is defined above
          items={filteredLichVanChuyenItems}
          isLoading={isLoading}
          onAdd={handleOpenModalForAdd}
          canAddPlan={canAddPlan} // Assuming canAddPlan is still relevant for add button visibility
          onEditItem={handleOpenModalForEdit}
          onDeleteItem={handleDelete}
        />
      )}

      {/* Modal for Add/Edit */}
      {isMobile ? (
        <Dialog
          fullScreen
          open={isModalOpen} // Removed && canAddPlan, let form decide if it shows content based on permissions if needed
          onClose={handleCloseModalMobile}
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' }}
          sx={{ '& .MuiDialog-paper': { background: '#ffffff' } }}
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
            <Box sx={{ flex: 1, overflow: 'auto', pr: 1, mr: -1, pb: 2 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              <MobileShipmentFormStepper
                editing={!!editingItem}
                formData={formData}
                onFormChange={handleInputChange}
                onSave={handleSubmit}
                isLoading={isLoading}
                error={error}
                selectOptions={selectOptions}
                onClose={handleCloseModalMobile}
                onAddNewCustomer={handleAddNewCustomer}
                resetForm={resetForm}
              />
            </Box>
          </DialogContent>
        </Dialog>
      ) : (
        <DesktopShipmentFormDialog
          open={isModalOpen}
          onClose={handleCloseModal}
          editing={!!editingItem}
          formData={formData}
          onFormChange={handleInputChange}
          onSubmit={handleSave}
          isLoading={isLoading}
          error={error}
          selectOptions={selectOptions}
        />
      )}

      {/* Confirmation Modal for delete */}
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
            {itemToDelete && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Mã chuyến: {itemToDelete.ma_chuyen}
              </Typography>
            )}
          </Box>
        }
      />
    </Box>
  );
};

export default QuanLyLichVanChuyen;
