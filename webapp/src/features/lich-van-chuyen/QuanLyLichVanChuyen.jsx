import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext'; // Import useAuth
import { ROLES } from '@/config/roles'; // Import ROLES
import {
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
import useLichVanChuyen from '@features/lich-van-chuyen/hooks/useLichVanChuyen';

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

// Function to handle descending comparator
function descendingComparator(
  /** @type {any} */ a,
  /** @type {any} */ b,
  /** @type {any} */ orderBy
) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

// Function to get comparator for sorting
function getComparator(
  /** @type {any} */ order,
  /** @type {any} */ orderBy,
  /** @type {any} */ columns
) {
  return order === 'desc'
    ? (a, b) => {
        /** @type {any} */ const column = columns?.find(col => col.id === orderBy);
        /** @type {any} */ const aValue = column?.sortValue
          ? column.sortValue(a[orderBy] ?? '')
          : (a[orderBy] ?? '');
        /** @type {any} */ const bValue = column?.sortValue
          ? column.sortValue(b[orderBy] ?? '')
          : (b[orderBy] ?? '');

        if (bValue < aValue) return -1;
        if (bValue > aValue) return 1;
        return 0;
      }
    : (a, b) => {
        /** @type {any} */ const column = columns?.find(col => col.id === orderBy);
        /** @type {any} */ const aValue = column?.sortValue
          ? column.sortValue(a[orderBy] ?? '')
          : (a[orderBy] ?? '');
        /** @type {any} */ const bValue = column?.sortValue
          ? column.sortValue(b[orderBy] ?? '')
          : (b[orderBy] ?? '');

        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      };
}

// Function to stable sort array
function stableSort(/** @type {any[]} */ array, /** @type {any} */ comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((/** @type {any} */ a, /** @type {any} */ b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map(el => el[0]);
}

const QuanLyLichVanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  // const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg')); // Unused variable

  // Sorting state
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('ngayDi');

  const { hasAnyRole } = useAuth(); // Get role checker
  const canAddPlan = hasAnyRole([ROLES.QUAN_LY, ROLES.GIAO_NHAN]); // Example: Manager and Dispatcher can add

  // Integrate the custom hook
  const {
    data: lichVanChuyenItems,
    loading: lichVanChuyenLoading,
    error: lichVanChuyenError,
    add: addLichVanChuyen,
    edit: editLichVanChuyen,
    remove: removeLichVanChuyen,
    fetchAll: refetchLichVanChuyen,
    clearError: clearLichVanChuyenError,
  } = useLichVanChuyen();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [selectOptions, setSelectOptions] = useState(
    /** @type {any} */ ({
      vehicles: [],
      customers: [],
      employees: [], // Added for employee dropdown
      containers: [], // Changed from containerTypes to containers
    })
  );
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
      ngay_van_chuyen: item.ngay_di || '', // Use ngay_di as the source of truth
      trang_thai: item.trang_thai || 'tam_thoi',
      khach_hang_id: item.ma_khach_hang || '',
      diem_xuat_phat: item.diem_di || '',
      diem_tra_hang: item.diem_den || '',
      bien_so_xe_id: item.bien_so_dau_keo || '',
      container_id: item.ma_so_cont || '',
      nhan_vien_giao_nhan_id: item.ma_nv_giao_nhan || '',
      nhan_vien_lai_xe_id: item.ma_nv_lai_xe || '',
      ghi_chu: item.ghi_chu || '',
      ngay_ha_hang: item.ngay_ha_hang || '',
      tong_chi_phi: item.vnd_dau || item.tong_chi_phi || 0,
      cuoc_van_chuyen: item.vnd_di_duong || item.cuoc_van_chuyen || 0,
      km_hang: item.km_hang || 0,
      km_vo: item.km_vo || 0,
      l_dau: item.l_dau || 0,
    };
  };

  // Fetch selectOptions only (vehicles, customers, employees, containers)
  const fetchSelectOptions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dauKeoList, roMoocList, customersList, employeesList, containersList] =
        await Promise.all([
          fetchAllDauKeo(),
          fetchAllRoMooc(),
          fetchAllKhachHang(),
          fetchAllNhanVien(),
          fetchAllContainer(),
        ]);
      setSelectOptions({
        vehicles: formatVehiclesForSelect(dauKeoList, roMoocList),
        customers: formatCustomersForSelect(customersList),
        employees: formatEmployeesForSelect(employeesList),
        containers: formatContainersForSelect(containersList),
      });
    } catch (err) {
      setError('Không thể tải dữ liệu chọn lọc.');
      console.error('Error fetching select options:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSelectOptions();
  }, [fetchSelectOptions]);

  const handleInputChange = (/** @type {any} */ e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleOpenModalForAdd = () => {
    setEditingItem(null);
    setFormData({
      ...initialFormState,
      ngay_van_chuyen: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
    clearLichVanChuyenError();
    setError('');
  };

  const handleOpenModalForEdit = (/** @type {any} */ item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
    clearLichVanChuyenError();
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormState);
    setError('');
    clearLichVanChuyenError();
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
    clearLichVanChuyenError();
    try {
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
      if (editingItem) {
        const result = await editLichVanChuyen(editingItem.id, formData);
        if (!result.success) throw new Error(result.error);
      } else {
        const result = await addLichVanChuyen(formData);
        if (!result.success) throw new Error(result.error);
      }
      refetchLichVanChuyen(true);
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData(initialFormState);
    } catch (err) {
      setError('Lỗi khi lưu lịch vận chuyển: ' + (err && err.message ? err.message : err));
      console.error('Error saving LichVanChuyen:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirmation = (/** @type {any} */ item) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
    clearLichVanChuyenError();
    setError('');
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    setError('');
    clearLichVanChuyenError();
    try {
      const result = await removeLichVanChuyen(itemToDelete.id);
      if (!result.success) throw new Error(result.error);
      refetchLichVanChuyen(true);
      // Optionally show a snackbar here
    } catch (err) {
      setError('Lỗi khi xóa lịch vận chuyển: ' + (err && err.message ? err.message : err));
      // Optionally show a snackbar here
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
    clearLichVanChuyenError();
    setError('');
  };

  const getEntityNameById = (id, list, keyField = 'id', nameField = 'name') => {
    const entity = list.find(item => item[keyField] === id);
    return entity ? entity[nameField] : '-';
  };

  // Mobile-specific handlers
  const handleCardExpand = (/** @type {any} */ planId) => {
    setExpandedCard(expandedCard === planId ? null : planId);
  };

  // Filter functions for mobile search
  const filteredLichVanChuyenItems = React.useMemo(() => {
    return lichVanChuyenItems.filter((/** @type {any} */ item) => {
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
    {
      id: 'ngayDi',
      header: 'Ngày Đi',
      width: '7%',
      sortable: true,
      sortValue: value => value || '',
    },
    {
      id: 'ngayHaHangDisplay',
      header: 'Ngày Hạ Hàng',
      width: '7%',
      sortable: true,
      sortValue: value => value || '',
    },
    {
      id: 'bienSoXe',
      header: 'Xe Vận Chuyển',
      width: '10%',
      sortable: true,
      sortValue: value => value || '',
      render: value => (
        <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
          {value || 'N/A'}
        </Box>
      ),
    },
    {
      id: 'dienGiai',
      header: 'Diễn Giải',
      width: '15%',
      sortable: true,
      sortValue: value => value || '',
    },
    {
      id: 'tuyenDuongDisplay',
      header: 'Tuyến Đường',
      width: '20%',
      sortable: true,
      sortValue: value => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        return `${value.diemDi || ''} ${value.diemDen || ''}`.trim();
      },
      render: value => {
        // Handle both old string format and new object format for backward compatibility
        const diemDi = value?.diemDi || (typeof value === 'string' ? value.split(' → ')[0] : 'N/A');
        const diemDen =
          value?.diemDen || (typeof value === 'string' ? value.split(' → ')[1] : 'N/A');

        return (
          <Box
            component="span"
            sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}
          >
            <Box
              component="span"
              sx={{
                color: 'primary.main',
                fontWeight: 500,
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                display: 'inline',
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
                alignItems: 'center',
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
                display: 'inline',
              }}
            >
              {diemDen}
            </Box>
          </Box>
        );
      },
    },
    {
      id: 'tongChiPhiDisplay',
      header: 'Tổng Chi Phí',
      align: 'right',
      width: '12%',
      sortable: true,
      sortValue: value => {
        // Extract numeric value from formatted currency
        return value ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0 : 0;
      },
    },
    {
      id: 'cuocVanChuyenDisplay',
      header: 'Cước Vận Chuyển',
      align: 'right',
      width: '12%',
      sortable: true,
      sortValue: value => {
        // Extract numeric value from formatted currency
        return value ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0 : 0;
      },
    },
    {
      id: 'loiNhuanGopDisplay',
      header: 'Lợi Nhuận Gộp',
      align: 'right',
      width: '12%',
      sortable: true,
      sortValue: value => {
        // Extract numeric value from formatted currency
        return value ? parseFloat(value.replace(/[^0-9.-]+/g, '')) || 0 : 0;
      },
    },
    {
      id: 'trang_thai',
      header: 'Trạng Thái',
      width: '8%',
      sortable: true,
      sortValue: value => getDisplayTrangThai(value),
      render: value => (
        <Chip
          label={getDisplayTrangThai(value)}
          size="small"
          sx={{
            backgroundColor: `${getStatusColor(value)}20`,
            color: getStatusColor(value),
            fontWeight: 500,
            minWidth: '90px !important',
            borderRadius: '4px',
            justifyContent: 'center',
          }}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Thao Tác',
      align: 'center',
      width: '7%',
      sortable: false,
      render: (_, row) => {
        const originalItem = lichVanChuyenItems.find(item => item.id === row.id) || row;
        return (
          <Box
            sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}
            onClick={e => e.stopPropagation()} // Stop event propagation here
          >
            <EditButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                handleOpenModalForEdit(originalItem);
              }}
            />
            <DeleteButton
              size="small"
              onClick={e => {
                e.stopPropagation();
                handleDeleteConfirmation(originalItem);
              }}
            />
          </Box>
        );
      },
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
          fontFamily: 'Inter, sans-serif',
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
          searchTerm={searchTerm}
          onSearchTermChange={e => setSearchTerm(e.target.value)}
          columns={columns}
          shipmentPlans={stableSort(
            filteredLichVanChuyenItems,
            getComparator(order, orderBy, columns)
          )}
          isLoading={isLoading}
          onAdd={handleOpenModalForAdd}
          canAddPlan={canAddPlan}
          onItemClick={row => {
            setSelectedShipment(row.original);
            setIsDetailModalOpen(true);
          }}
          order={order}
          orderBy={orderBy}
          onRequestSort={(event, property) => {
            const isAsc = orderBy === property && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(property);
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
                <strong>Ngày hạ hàng:</strong>{' '}
                {selectedShipment.ngayHaHangDisplay || 'Chưa cập nhật'}
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
                Mã chuyến: {itemToDelete.ma_chuyen}
                <br />
                Khách hàng:{' '}
                {getEntityNameById(
                  itemToDelete.khach_hang_id,
                  selectOptions.customers,
                  'id',
                  'ten'
                )}
                <br />
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
