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
  Button,
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
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

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
      ngay_van_chuyen: item.ngay_di || item.ngay_van_chuyen || '', // Map ngay_di to ngay_van_chuyen
      trang_thai: item.trang_thai || 'tam_thoi',
      khach_hang_id: item.ma_khach_hang || item.khach_hang_id || '',
      diem_xuat_phat: item.diem_di || item.diem_xuat_phat || '',
      diem_tra_hang: item.diem_den || item.diem_tra_hang || '',
      bien_so_xe_id: item.bien_so_dau_keo || item.bien_so_xe_id || '',
      container_id: item.ma_so_cont || item.container_id || '',
      nhan_vien_giao_nhan_id: item.ma_nv_giao_nhan || item.nhan_vien_giao_nhan_id || '',
      nhan_vien_lai_xe_id: item.ma_nv_lai_xe || item.nhan_vien_lai_xe_id || '',
      ghi_chu: item.ghi_chu || '',
      ngay_ha_hang: item.ngay_ha_hang || '',
      tong_chi_phi: item.vnd_dau || item.tong_chi_phi || 0,
      cuoc_van_chuyen: item.vnd_di_duong || item.cuoc_van_chuyen || 0,
      km_hang: item.km_hang || 0,
      km_vo: item.km_vo || 0,
      l_dau: item.l_dau || 0,
    };
  };

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log('Fetching data from APIs...');
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

      console.log('Raw data from APIs:', {
        lichVanChuyenList: lichVanChuyenList?.length || 0,
        dauKeoList: dauKeoList?.length || 0,
        roMoocList: roMoocList?.length || 0,
        customersList: customersList?.length || 0,
        employeesList: employeesList?.length || 0,
        containersList: containersList?.length || 0,
      });

      const vehiclesData = formatVehiclesForSelect(dauKeoList, roMoocList);
      const customersData = formatCustomersForSelect(customersList);
      const employeesData = formatEmployeesForSelect(employeesList);
      const containersData = formatContainersForSelect(containersList);

      console.log('Processing lichVanChuyenList items. Count:', lichVanChuyenList.length);
      const processedLichVanChuyenList = lichVanChuyenList.map((item, index) => {
        console.log(`Processing item ${index + 1}/${lichVanChuyenList.length}:`, item);
        // Map fields from both old and new field names
        const ma_chuyen = item.ma_chuyen || '';
        const ngay_di = item.ngay_di || item.ngay_van_chuyen || '';
        const diem_di = item.diem_di || item.diem_xuat_phat || '';
        const diem_den = item.diem_den || item.diem_tra_hang || '';
        const ma_khach_hang = item.ma_khach_hang || item.khach_hang_id || '';
        const bien_so_dau_keo = item.bien_so_dau_keo || item.bien_so_xe_id || '';
        const ma_so_cont = item.ma_so_cont || item.container_id || '';
        const trang_thai = item.trang_thai || 'tam_thoi';
        const ghi_chu = item.ghi_chu || '';
        const ngay_ha_hang = item.ngay_ha_hang || '';
        const ma_nv_giao_nhan = item.ma_nv_giao_nhan || item.nhan_vien_giao_nhan_id || '';
        const ma_nv_lai_xe = item.ma_nv_lai_xe || item.nhan_vien_lai_xe_id || '';
        const vnd_dau = item.vnd_dau || item.tong_chi_phi || 0;
        const vnd_di_duong = item.vnd_di_duong || item.cuoc_van_chuyen || 0;
        const km_hang = item.km_hang || 0;
        const km_vo = item.km_vo || 0;
        const l_dau = item.l_dau || 0;

        // Find related entities
        const customer = customersList.find(c => c.id === ma_khach_hang || c.ma_khach_hang === ma_khach_hang);
        let vehicle = dauKeoList.find(v => v.id === bien_so_dau_keo || v.bien_so === bien_so_dau_keo);
        if (!vehicle) {
            vehicle = roMoocList.find(v => v.id === bien_so_dau_keo || v.bien_so === bien_so_dau_keo);
        }
        const container = containersList.find(cont => cont.id === ma_so_cont || cont.ma_so === ma_so_cont);
        const giaoNhan = employeesList.find(emp => emp.id === ma_nv_giao_nhan || emp.ma_nhan_vien === ma_nv_giao_nhan);
        const laiXe = employeesList.find(emp => emp.id === ma_nv_lai_xe || emp.ma_nhan_vien === ma_nv_lai_xe);

        const loi_nhuan_gop = vnd_di_duong - vnd_dau;
        
        return {
            // Original fields
            ...item,
            
            // Mapped fields (support both old and new field names)
            id: item.id,
            ma_chuyen,
            ngay_di,
            diem_di,
            diem_den,
            ma_khach_hang,
            bien_so_dau_keo,
            ma_so_cont,
            trang_thai,
            ghi_chu,
            ngay_ha_hang,
            ma_nv_giao_nhan,
            ma_nv_lai_xe,
            vnd_dau,
            vnd_di_duong,
            km_hang,
            km_vo,
            l_dau,
            
            // Computed fields for display
            ngayDi: formatDateForDisplay(ngay_di),
            ngayHaHangDisplay: formatDateForDisplay(ngay_ha_hang),
            bienSoXe: vehicle ? vehicle.bien_so : 'N/A',
            dienGiai: ghi_chu || ma_chuyen || 'N/A',
            tuyenDuongDisplay: `${diem_di || 'N/A'} → ${diem_den || 'N/A'}`,
            tongChiPhiDisplay: formatCurrencyVND(vnd_dau),
            cuocVanChuyenDisplay: formatCurrencyVND(vnd_di_duong),
            loiNhuanGopDisplay: formatCurrencyVND(loi_nhuan_gop),
            
            // Mobile view fields
            ngayThang: formatDateForDisplay(ngay_di),
            khachHang: customer ? customer.ten || customer.ho_ten : 'N/A',
            tuyenDuong: {
                diemDi: diem_di || 'N/A',
                diemDen: diem_den || 'N/A',
            },
            soLuongContainer: ma_so_cont ? 1 : 0,
            loaiContainer: container ? `${container.ma_so || container.id} (${container.loai || container.phan_loai || 'Chưa rõ'})` : 'N/A',
            nhanVienGiaoNhan: giaoNhan ? giaoNhan.ho_ten : 'N/A',
            nhanVienLaiXe: laiXe ? laiXe.ho_ten : 'N/A',
        };
      });
      
      console.log('Processed lichVanChuyenList:', processedLichVanChuyenList);
      console.log('Sample processed item (first item):', processedLichVanChuyenList[0]);

      console.log('Setting lichVanChuyenItems with count:', processedLichVanChuyenList.length);
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
  const filteredLichVanChuyenItems = React.useMemo(() => {
    console.log('Filtering items. searchTerm:', searchTerm, 'filterStatus:', filterStatus);
    console.log('lichVanChuyenItems count:', lichVanChuyenItems.length);
    
    const filtered = lichVanChuyenItems.filter(item => {
      try {
        if (!item) return false;
        
        const matchesSearch =
          !searchTerm ||
          (item.ma_chuyen && item.ma_chuyen.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.ghi_chu && item.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = !filterStatus || item.trang_thai === filterStatus;
        
        return matchesSearch && matchesStatus;
      } catch (error) {
        console.error('Error filtering item:', error, 'Item:', item);
        return false;
      }
    });
    
    console.log('Filtered items count:', filtered.length);
    if (filtered.length > 0) {
      console.log('First filtered item:', filtered[0]);
    }
    
    return filtered;
  }, [lichVanChuyenItems, searchTerm, filterStatus]);

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
  { 
    id: 'bienSoXe', 
    header: 'Xe Vận Chuyển', 
    width: '10%',
    render: (value) => (
      <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
        {value || 'N/A'}
      </Box>
    )
  },
  { id: 'dienGiai', header: 'Diễn Giải', width: '15%' },
  {
    id: 'tuyenDuongDisplay',
    header: 'Tuyến Đường',
    width: '20%',
    render: (value) => {
      // Handle both old string format and new object format for backward compatibility
      const diemDi = value?.diemDi || (typeof value === 'string' ? value.split(' → ')[0] : 'N/A');
      const diemDen = value?.diemDen || (typeof value === 'string' ? value.split(' → ')[1] : 'N/A');

      return (
        <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
          <Box
            component="span"
            sx={{
              color: 'primary.main',
              fontWeight: 500,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              display: 'inline'
            }}
          >
            {diemDi}
          </Box>
          <Box
            component="span"
            sx={{
              color: 'text.secondary',
              mx: 0.5,
              lineHeight: 1.5,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            →
          </Box>
          <Box
            component="span"
            sx={{
              color: 'secondary.main',
              fontWeight: 500,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              display: 'inline'
            }}
          >
            {diemDen}
          </Box>
        </Box>
      );
    },
  },
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
        columns={columns}
        searchTerm={searchTerm}
        onSearchTermChange={e => setSearchTerm(e.target.value)}
        shipmentPlans={filteredLichVanChuyenItems}
        isLoading={isLoading}
        onAdd={handleOpenModalForAdd}
        canAddPlan={canAddPlan}
        onEditItem={handleOpenModalForEdit}
        onDeleteItem={handleDeleteConfirmation}
        onItemClick={(row) => {
          setSelectedShipment(row.original);
          setIsDetailModalOpen(true);
        }}
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
      {/* Shipment Detail Modal */}
      <Dialog
        open={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chi Tiết Chuyến Hàng</DialogTitle>
        <DialogContent>
          {selectedShipment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Mã chuyến:</strong> {selectedShipment.ma_chuyen}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Ngày đi:</strong> {selectedShipment.ngayDi}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Ngày hạ hàng:</strong> {selectedShipment.ngayHaHangDisplay || 'Chưa cập nhật'}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Khách hàng:</strong> {selectedShipment.khachHang}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Biển số xe:</strong> {selectedShipment.bienSoXe}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Tuyến đường:</strong> {selectedShipment.tuyenDuongDisplay}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Trạng thái:</strong> {getDisplayTrangThai(selectedShipment.trang_thai)}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Ghi chú:</strong> {selectedShipment.ghi_chu || 'Không có ghi chú'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

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
