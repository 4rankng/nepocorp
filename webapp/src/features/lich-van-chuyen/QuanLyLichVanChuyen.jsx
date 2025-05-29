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
  id: null,
  ma_chuyen: '',
  ngay_di: new Date().toISOString().split('T')[0],
  ngay_ha_hang: new Date().toISOString().split('T')[0],
  trang_thai: 'len_lich',
  ma_khach_hang: '',
  diem_di: '',
  diem_den: '',
  cuoc_van_chuyen_vnd: 0,
  cuoc_thue_van_chuyen_vnd: 0,
  bien_so_dau_keo: '',
  ma_so_cont: '',
  ma_nv_giao_nhan: '',
  ma_nv_lai_xe: '',
  ghi_chu: '',
  km_hang: 0,
  km_vo: 0,
  l_dau: 0,
  vnd_dau: 0,
  vnd_di_duong: 0,
  vnd_chi_phi: 0,
  createdAt: '',
  updatedAt: '',
};

// Helper functions moved to ./utils/lichVanChuyenUtils.js

/**
 * @param {any} a
 * @param {any} b
 * @param {any} orderBy
 */
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

/**
 * @param {any} order
 * @param {any} orderBy
 * @param {any} columns
 */
function getComparator(order, orderBy, columns) {
  return order === 'desc'
    ? (
        /** @type {any} */ a,
        /** @type {any} */ b
      ) => {
        /** @type {any} */ const column = columns?.find(
          /** @type {any} */ col => col.id === orderBy
        );
        /** @type {any} */ const aValue = column?.sortValue
          ? column.sortValue(a[orderBy] ?? '')
          : a[orderBy];
        /** @type {any} */ const bValue = column?.sortValue
          ? column.sortValue(b[orderBy] ?? '')
          : b[orderBy];
        return descendingComparator(aValue, bValue, orderBy);
      }
    : (
        /** @type {any} */ a,
        /** @type {any} */ b
      ) => {
        /** @type {any} */ const column = columns?.find(
          /** @type {any} */ col => col.id === orderBy
        );
        /** @type {any} */ const aValue = column?.sortValue
          ? column.sortValue(a[orderBy] ?? '')
          : a[orderBy];
        /** @type {any} */ const bValue = column?.sortValue
          ? column.sortValue(b[orderBy] ?? '')
          : b[orderBy];
        return -descendingComparator(aValue, bValue, orderBy);
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

// --- Remove mapping function for table rows ---

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

  // eslint-disable-next-line
  const mapLichVanChuyenToFormData = item => {
    if (!item) return initialFormState;
    return {
      id: item.id || '',
      ma_chuyen: item.ma_chuyen || '',
      ngay_di: item.ngay_di || '',
      ngay_ha_hang: item.ngay_ha_hang || '',
      trang_thai: item.trang_thai || 'len_lich',
      ma_khach_hang: item.ma_khach_hang || '',
      diem_di: item.diem_di || '',
      diem_den: item.diem_den || '',
      cuoc_van_chuyen_vnd: item.cuoc_van_chuyen_vnd || 0,
      cuoc_thue_van_chuyen_vnd: item.cuoc_thue_van_chuyen_vnd || 0,
      bien_so_dau_keo: item.bien_so_dau_keo || '',
      ma_so_cont: item.ma_so_cont || '',
      ma_nv_giao_nhan: item.ma_nv_giao_nhan || '',
      ma_nv_lai_xe: item.ma_nv_lai_xe || '',
      ghi_chu: item.ghi_chu || '',
      km_hang: item.km_hang || 0,
      km_vo: item.km_vo || 0,
      l_dau: item.l_dau || 0,
      vnd_dau: item.vnd_dau || 0,
      vnd_di_duong: item.vnd_di_duong || 0,
      vnd_chi_phi: item.vnd_chi_phi || 0,
      createdAt: item.createdAt || '',
      updatedAt: item.updatedAt || '',
    };
  };

  // Fetch selectOptions only (vehicles, customers, employees, containers)
  const fetchSelectOptions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [dauKeoList, roMoocList, customersResult, employeesResult, containersResult] =
        await Promise.all([
          fetchAllDauKeo(),
          fetchAllRoMooc(),
          fetchAllKhachHang(),
          fetchAllNhanVien(),
          fetchAllContainer(),
        ]);
      const customersList = customersResult.data || [];
      const employeesList = employeesResult.data || [];
      const containersList = containersResult.data || [];
      console.log('Fetched dauKeoList:', dauKeoList);
      console.log('Fetched roMoocList:', roMoocList);
      console.log('Fetched customersList:', customersList);
      console.log('Fetched employeesList:', employeesList);
      console.log('Fetched containersList:', containersList);
      setSelectOptions({
        vehicles: formatVehiclesForSelect(dauKeoList, roMoocList),
        customers: formatCustomersForSelect(customersList),
        employees: formatEmployeesForSelect(employeesList),
        containers: formatContainersForSelect(containersList),
      });
      console.log('Set selectOptions:', {
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

  const handleInputChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleOpenModalForAdd = () => {
    setEditingItem(null);
    setFormData({
      ...initialFormState,
      ngay_di: new Date().toISOString().split('T')[0],
      ngay_ha_hang: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
    clearLichVanChuyenError();
    setError('');
  };

  const handleOpenModalForEdit = item => {
    setEditingItem(item);
    setFormData(mapLichVanChuyenToFormData(item));
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
        !formData.ngay_di ||
        !formData.ma_khach_hang ||
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

  const handleDeleteConfirmation = item => {
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
  // const filteredLichVanChuyenItems = React.useMemo(() => {
  //   return lichVanChuyenItems.filter((/** @type {any} */ item) => {
  //     try {
  //       if (!item) return false;
  //       const matchesSearch =
  //         !searchTerm ||
  //         (item.ma_chuyen && item.ma_chuyen.toLowerCase().includes(searchTerm.toLowerCase())) ||
  //         (item.ghi_chu && item.ghi_chu.toLowerCase().includes(searchTerm.toLowerCase()));
  //       const matchesStatus = !filterStatus || item.trang_thai === filterStatus;
  //       return matchesSearch && matchesStatus;
  //     } catch (error) {
  //       console.error('Error filtering item:', error, 'Item:', item);
  //       return false;
  //     }
  //   });
  // }, [lichVanChuyenItems, searchTerm, filterStatus]);
  const filteredLichVanChuyenItems = lichVanChuyenItems;

  // Handle form submission for mobile stepper
  // This handleSubmit is called by MobileShipmentFormStepper via onSave prop
  const handleSubmit = () => {
    handleSave();
  };

  // Define columns for DesktopView StandardTable
  const columns = [
    { id: 'maChuyen', header: 'Mã chuyến', align: 'left', width: '8%', sortable: true },
    { id: 'ngayDi', header: 'Ngày đi', align: 'center', width: '8%', sortable: true },
    {
      id: 'ngayHaHangDisplay',
      header: 'Ngày hạ hàng',
      align: 'center',
      width: '8%',
      sortable: true,
    },
    { id: 'trang_thai', header: 'Trạng thái', align: 'center', width: '8%', sortable: true },
    { id: 'khachHang', header: 'Khách hàng', align: 'left', width: '10%', sortable: true },
    { id: 'diemDi', header: 'Điểm đi', align: 'left', width: '10%', sortable: true },
    { id: 'diemDen', header: 'Điểm đến', align: 'left', width: '10%', sortable: true },
    {
      id: 'cuocVanChuyenDisplay',
      header: 'Cước vận chuyển',
      align: 'right',
      width: '10%',
      sortable: true,
    },
    {
      id: 'cuocThueVanChuyenDisplay',
      header: 'Cước thuê VC',
      align: 'right',
      width: '10%',
      sortable: true,
    },
    { id: 'bienSoDauKeo', header: 'Biển số đầu kéo', align: 'center', width: '8%', sortable: true },
    { id: 'maSoCont', header: 'Mã số Cont', align: 'center', width: '8%', sortable: true },
    { id: 'giaoNhan', header: 'Giao nhận', align: 'left', width: '10%', sortable: true },
    { id: 'laiXe', header: 'Lái xe', align: 'left', width: '10%', sortable: true },
    { id: 'ghi_chu', header: 'Ghi chú', align: 'left', width: '12%', sortable: false },
    { id: 'vndChiPhi', header: 'Tổng Chi Phí', align: 'right', width: '10%', sortable: true },
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

  // In DesktopView, use lichVanChuyenItems directly for shipmentPlans
  const mappedTableData = stableSort(
    filteredLichVanChuyenItems,
    getComparator(order, orderBy, columns)
  );

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
          shipmentPlans={mappedTableData}
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
                <strong>Mã chuyến:</strong> {selectedShipment.maChuyen}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Ngày đi:</strong> {selectedShipment.ngayDi}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Ngày hạ hàng:</strong>{' '}
                {selectedShipment.ngayHaHangDisplay || 'Chưa cập nhật'}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Khách hàng:</strong>{' '}
                {selectOptions.customers.find(c => c.value === selectedShipment.khachHang)?.label ||
                  selectedShipment.khachHang}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Biển số xe:</strong> {selectedShipment.bienSoDauKeo}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                <strong>Tuyến đường:</strong> {selectedShipment.diemDi} - {selectedShipment.diemDen}
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
