import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext'; // Import useAuth
import { ROLES } from '@/config/roles'; // Import ROLES
import {
  fetchAllLichVanChuyen,
  addLichVanChuyen,
  editLichVanChuyen,
  removeLichVanChuyen,
  fetchAllNhanVien, // Updated to use API function
  fetchAllContainer, // Updated to use API function
  fetchAllKhachHang, // Added for customer API
  fetchAllDauKeo, // Added for vehicles
  fetchAllRoMooc, // Added for vehicles
} from '@services/mockApi/index.js';
// import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx'; // Not used directly in this component
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
  // TextField, // Used in child components
  // MenuItem, // Used in child components
  // Stepper, // Used in child components
  // Step, // Used in child components
  // StepLabel, // Used in child components
  // StepContent, // Used in child components
  // Collapse, // Not used
  Slide, // Used for Dialog transition
  // Fade, // Not used
  Tooltip,
  Chip,
} from '@mui/material';
// import CloseIcon from '@mui/icons-material/Close'; // Used in child components
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Used in child components

import { EditButton, DeleteButton } from '@/components/ActionButtons';
import MobileView from '@features/lich-van-chuyen/components/MobileView';
import DesktopView from '@features/lich-van-chuyen/components/DesktopView';
import DesktopShipmentFormDialog from '@features/lich-van-chuyen/components/DesktopShipmentFormDialog';
import MobileShipmentFormStepper from '@features/lich-van-chuyen/components/MobileShipmentFormStepper';
import { getStatusColor } from './utils/styleUtils';
import InfoIcon from '@mui/icons-material/Info'; // For guidance message
import {
  getDisplayTrangThai,
  formatDateForDisplay,
  formatCurrencyVND, // Import currency formatter
  formatVehiclesForSelect,
  formatCustomersForSelect,
  formatEmployeesForSelect,
  formatContainersForSelect,
  addQuickCustomer,
} from './utils/lichVanChuyenUtils';

const initialFormState = {
  id: null, // Add id for consistency, will be populated on edit
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
  ngay_ha_hang: new Date().toISOString().split('T')[0],
  tong_chi_phi: 0,
  cuoc_van_chuyen: 0,
  // Note: This structure is based on the lichVanChuyenApi.
  // UI forms will need significant updates to match these fields.
};

// Helper functions moved to ./utils/lichVanChuyenUtils.js

const QuanLyLichVanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // Unused variable

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
  // const [isFormExpanded, setIsFormExpanded] = useState(!isMobile); // Unused variable

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
      ngay_ha_hang: item.ngay_ha_hang || '',
      tong_chi_phi: item.tong_chi_phi || 0,
      cuoc_van_chuyen: item.cuoc_van_chuyen || 0,
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

      const processedLichVanChuyenList = lichVanChuyenList.map(item => {
        const customer = customersList.find(c => c.id === item.khach_hang_id);

        let vehicle = dauKeoList.find(v => v.id === item.bien_so_xe_id);
        if (!vehicle) {
            vehicle = roMoocList.find(v => v.id === item.bien_so_xe_id);
        }

        const container = containersList.find(cont => cont.id === item.container_id);
        const giaoNhan = employeesList.find(emp => emp.id === item.nhan_vien_giao_nhan_id);
        const laiXe = employeesList.find(emp => emp.id === item.nhan_vien_lai_xe_id);

        const loi_nhuan_gop = (item.cuoc_van_chuyen || 0) - (item.tong_chi_phi || 0);
        return {
            ...item, // Spread original item to keep all its data for editing/deleting
            // Fields for table display
            ngayDi: formatDateForDisplay(item.ngay_van_chuyen),
            ngayHaHangDisplay: formatDateForDisplay(item.ngay_ha_hang),
            dienGiai: item.ghi_chu || item.ma_chuyen || 'N/A',
            tuyenDuongDisplay: `${item.diem_xuat_phat || 'N/A'} → ${item.diem_tra_hang || 'N/A'}`,
            tongChiPhiDisplay: formatCurrencyVND(item.tong_chi_phi),
            cuocVanChuyenDisplay: formatCurrencyVND(item.cuoc_van_chuyen),
            loiNhuanGopDisplay: formatCurrencyVND(loi_nhuan_gop),

            // Fields for mobile view / general use
            ngayThang: formatDateForDisplay(item.ngay_van_chuyen), // Used by MobileView
            khachHang: customer ? customer.ten : 'N/A', // Used by MobileView
            bienSoXe: vehicle ? vehicle.bien_so : 'N/A', // Used by MobileView
            tuyenDuong: { // Used by MobileView (potentially)
                diemDi: item.diem_xuat_phat || 'N/A',
                diemDen: item.diem_tra_hang || 'N/A',
            },
            soLuongContainer: item.container_id ? 1 : 0, // Used by MobileView
            loaiContainer: container ? `${container.id} (${container.phan_loai || 'Chưa rõ'})` : 'N/A', // Used by MobileView
            nhanVienGiaoNhan: giaoNhan ? giaoNhan.ho_ten : 'N/A', // Used by MobileView
            nhanVienLaiXe: laiXe ? laiXe.ho_ten : 'N/A', // Used by MobileView
        };
    });

      setLichVanChuyenItems(processedLichVanChuyenList);
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
  }, []); // fetchAllLichVanChuyen is stable, setLichVanChuyenItems is part of this component's state setters

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

  const handleDeleteConfirmation = item => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    setError('');
    try {
      await removeLichVanChuyen(itemToDelete.id);
      // Optimistically update UI or refetch
      setLichVanChuyenItems(prevItems => prevItems.filter(i => i.id !== itemToDelete.id));
      // fetchPageData(); // Alternatively, refetch all data
      showSnackbar('Xóa lịch vận chuyển thành công!', 'success');
    } catch (err) {
      setError(`Lỗi khi xóa lịch vận chuyển: ${err.message}`);
      showSnackbar(`Lỗi khi xóa: ${err.message}`, 'error'); // Assuming showSnackbar exists
      console.error('Error deleting LichVanChuyen:', err);
    }
    setIsLoading(false);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  // This function is redundant if handleDeleteConfirmed is used by the modal
  // const handleDeleteConfirm = async () => {
  //   if (itemToDelete) {
  //     setIsLoading(true);
  //     setError('');
  //     try {
  //       await removeLichVanChuyen(itemToDelete.id);
  //       fetchPageData(); // Refresh data
  //       setIsDeleteModalOpen(false);
  //       setItemToDelete(null);
  //     } catch (err) {
  //       setError(`Lỗi khi xóa lịch vận chuyển: ${err.message}`);
  //       console.error('Error deleting LichVanChuyen:', err);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   }
  // };

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
  // This 'columns' definition was from an older version or a merge artifact.
  // The correct one is defined later and used by DesktopView.
  // Removing this older definition to avoid confusion.
  // The old block has been removed.

// Define columns for DesktopView StandardTable
const columns = [
  { id: 'ngayDi', header: 'Ngày Đi', width: '7%' },
  { id: 'ngayHaHangDisplay', header: 'Ngày Hạ Hàng', width: '7%' },
  { id: 'dienGiai', header: 'Diễn Giải', width: '20%' },
  { id: 'tuyenDuongDisplay', header: 'Tuyến Đường', width: '20%' },
  { id: 'tongChiPhiDisplay', header: 'Tổng Chi Phí', align: 'right', width: '12%' },
  { id: 'cuocVanChuyenDisplay', header: 'Cước Vận Chuyển', align: 'right', width: '12%' },
  { id: 'loiNhuanGopDisplay', header: 'Lợi Nhuận Gộp', align: 'right', width: '12%' },
  { 
    id: 'trang_thai', 
    header: 'Trạng Thái', 
    width: '8%',
    render: (value) => (
      <Chip 
        label={getDisplayTrangThai(value)} 
        size="small" 
        sx={{ 
          backgroundColor: `${getStatusColor(value)}20`, 
          color: getStatusColor(value),
          fontWeight: 500,
          width: '90px',
          maxWidth: '90px',
          minWidth: '90px !important',
          borderRadius: '4px',
          justifyContent: 'center'
        }} 
      />
    )
  },
  {
    id: 'actions',
    header: 'Thao Tác',
    align: 'center',
    width: '7%',
    render: (_, row) => {
      const originalItem = lichVanChuyenItems.find(item => item.id === row.id) || row;
      return (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <EditButton size="small" onClick={() => handleOpenModalForEdit(originalItem)} />
          <DeleteButton size="small" onClick={() => handleDeleteConfirmation(originalItem)} />
        </Box>
      );
    }
  },
];

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
      px: isMobile ? 2 : 3, // Horizontal padding
      pt: 0, // No top padding
      pb: isMobile ? 1 : 2, // Keep bottom padding
      backgroundColor: theme.palette.background.paper, // Change to white
      minHeight: 'calc(100vh - 64px)',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <Typography
      variant={isMobile ? 'h6' : 'h5'}
      component="h1"
      gutterBottom
      sx={{
        fontWeight: 'bold',
        fontFamily: "Inter, sans-serif",
        mb: isMobile ? 2 : 3,
      }}
    >
      Quản Lý Lịch Vận Chuyển
    </Typography>



    {isLoading && (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
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
        filteredPlans={filteredLichVanChuyenItems}
        isLoading={isLoading}
        expandedCard={expandedCard}
        onCardExpand={handleCardExpand}
        onEdit={handleOpenModalForEditMobile}
        onDelete={handleDeleteConfirmation} // Use confirmation flow for mobile delete
        onAdd={handleOpenModalForAddMobile}
        canAddPlan={canAddPlan} // Assuming canAddPlan is still relevant for add button visibility
      />
    ) : (
      <DesktopView
        columns={columns} // Pass columns to DesktopView
        searchTerm={searchTerm}
        onSearchTermChange={e => setSearchTerm(e.target.value)}
        shipmentPlans={filteredLichVanChuyenItems}
        isLoading={isLoading}
        onAdd={handleOpenModalForAdd}
        canAddPlan={canAddPlan} // Assuming canAddPlan is still relevant for add button visibility
        onEditItem={handleOpenModalForEdit}
        onDeleteItem={handleDeleteConfirmation} // Align DesktopView delete to use confirmation flow
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
              {/* Error display for the form itself */}
              {error && !isDeleteModalOpen && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}
              <MobileShipmentFormStepper
                editing={!!editingItem}
                formData={formData}
                onFormChange={handleInputChange} // Assuming handleInputChange exists
                onSave={handleSubmit} // handleSubmit calls handleSave
                isLoading={isLoading}
                error={error} // Pass error for form-specific display if needed
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
          onFormChange={handleInputChange} // Assuming handleInputChange exists
          onSubmit={handleSave}
          isLoading={isLoading}
          error={error}
          selectOptions={selectOptions}
        />
      )}

      {/* Confirmation Modal for delete - This should be outside the main mobile/desktop view ternary */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirmed}
        title="Xác nhận xóa"
        message={
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa lịch vận chuyển này?
            </Typography>
            {itemToDelete && (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Mã chuyến: {itemToDelete.ma_chuyen}<br />
                Khách hàng: {getEntityNameById(itemToDelete.khach_hang_id, selectOptions.customers, 'id', 'ten')}<br />
                Ngày đi: {formatDateForDisplay(itemToDelete.ngay_van_chuyen)}
              </Typography>
            )}
          </Box>
        }
      />
    </Box>
  );
};

export default QuanLyLichVanChuyen;
