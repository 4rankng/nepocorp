import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@contexts/AuthContext';
import { ROLES } from '@/config/roles';
import {
  fetchAllLichVanChuyen,
  addLichVanChuyen,
  editLichVanChuyen,
  removeLichVanChuyen,
} from '@services/mockApi/lichVanChuyenApi';
import { fetchAllNhanVien } from '@services/mockApi/nhanVienApi';
import { fetchAllContainer } from '@services/mockApi/containerApi';
import { fetchAllKhachHang } from '@services/mockApi/khachHangApi';
import { fetchAllDauKeo } from '@services/mockApi/dauKeoApi';
import { fetchAllRoMooc } from '@services/mockApi/roMoocApi';
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
// import InfoIcon from '@mui/icons-material/Info'; // For guidance message - Linter flags as unused
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
  id: null,
  ma_chuyen: '',
  ngay_di: new Date().toISOString().split('T')[0], // Default to today
  trang_thai: 'Chờ xác nhận',
  ma_khach_hang: '',
  diem_di: '',
  diem_den: '',
  bien_so_dau_keo: '',
  ma_so_cont: '',
  ma_nv_giao_nhan: '',
  ma_nv_lai_xe: '',
  bien_so_ro_mooc: '', // Optional
  ghi_chu: '',
  d_dau_keo: 0,
  d_ro_mooc: 0,
  l_dau: 0,
};

/**
 * Comparator for descending sort.
 * @param {object} a - First item.
 * @param {object} b - Second item.
 * @param {string} orderBy - Property to sort by.
 * @returns {number}
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
 * Get a comparator function for sorting.
 * @param {'asc' | 'desc'} order - Sort order.
 * @param {string} orderBy - Property to sort by.
 * @param {Array<object>} columns - Column definitions.
 * @returns {function(object, object): number}
 */
function getComparator(order, orderBy, columns) {
  return order === 'desc'
    ? (a, b) => {
        const column = columns?.find(col => col.id === orderBy);
        const aValue = column?.sortValue ? column.sortValue(a[orderBy] ?? '') : (a[orderBy] ?? '');
        const bValue = column?.sortValue ? column.sortValue(b[orderBy] ?? '') : (b[orderBy] ?? '');

        if (bValue < aValue) return -1;
        if (bValue > aValue) return 1;
        return 0;
      }
    : (a, b) => {
        const column = columns?.find(col => col.id === orderBy);
        const aValue = column?.sortValue ? column.sortValue(a[orderBy] ?? '') : (a[orderBy] ?? '');
        const bValue = column?.sortValue ? column.sortValue(b[orderBy] ?? '') : (b[orderBy] ?? '');

        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      };
}

/**
 * Stable sort an array.
 * @param {Array<object>} array - Array to sort.
 * @param {function(object, object): number} comparator - Comparator function.
 * @returns {Array<object>}
 */
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map(el => el[0]);
}

// Map status codes to display text
const trangThaiMap = {
  len_lich: 'Lên lịch',
  tam_thoi: 'Chờ xác nhận',
  dang_chay: 'Đang chạy',
  hoan_thanh: 'Hoàn thành',
  huy_bo: 'Hủy bỏ',
};

const QuanLyLichVanChuyen = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { hasAnyRole } = useAuth();
  const canAddPlan = hasAnyRole([ROLES.QUAN_LY, ROLES.GIAO_NHAN]);

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('ngayDi');

  const [lichVanChuyenItems, setLichVanChuyenItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [selectOptions, setSelectOptions] = useState({
    dauKeo: [],
    roMooc: [],
    khachHang: [],
    nhanVien: [],
    container: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedCard, setExpandedCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState(null);

  const mapLichVanChuyenToFormData = item => {
    if (!item) return initialFormState;
    return {
      id: item.id,
      ma_chuyen: item.ma_chuyen || '',
      ngay_di: item.ngay_di ? item.ngay_di.split('T')[0] : new Date().toISOString().split('T')[0],
      trang_thai: item.trang_thai || 'Chờ xác nhận',
      ma_khach_hang: item.ma_khach_hang || '',
      diem_di: item.diem_di || '',
      diem_den: item.diem_den || '',
      bien_so_dau_keo: item.bien_so_dau_keo || '',
      ma_so_cont: item.ma_so_cont || '',
      ma_nv_giao_nhan: item.ma_nv_giao_nhan || '',
      ma_nv_lai_xe: item.ma_nv_lai_xe || '',
      bien_so_ro_mooc: item.bien_so_ro_mooc || '',
      ghi_chu: item.ghi_chu || '',
      d_dau_keo: item.d_dau_keo || 0,
      d_ro_mooc: item.d_ro_mooc || 0,
      l_dau: item.l_dau || 0,
    };
  };

  const fetchPageData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [
        lichVanChuyenList,
        nhanVienList,
        containerList,
        khachHangList,
        dauKeoList,
        roMoocList,
      ] = await Promise.all([
        fetchAllLichVanChuyen(),
        fetchAllNhanVien(),
        fetchAllContainer(),
        fetchAllKhachHang(),
        fetchAllDauKeo(),
        fetchAllRoMooc(),
      ]);

      // Extract the actual customer list from the response object
      const actualKhachHangList = khachHangList?.data || [];

      console.log('Raw data from APIs:', {
        lichVanChuyenList: lichVanChuyenList?.length || 0,
        nhanVienList: nhanVienList?.length || 0,
        containerList: containerList?.length || 0,
        khachHangList: actualKhachHangList?.length || 0,
        dauKeoList: dauKeoList?.length || 0,
        roMoocList: roMoocList?.length || 0,
      });

      // Log the first item to see its exact structure
      if (lichVanChuyenList && lichVanChuyenList.length > 0) {
      }

      setLichVanChuyenItems(lichVanChuyenList);

      const vehiclesData = formatVehiclesForSelect(dauKeoList, roMoocList);
      const customersData = formatCustomersForSelect(actualKhachHangList); // Use the extracted list
      const employeesData = formatEmployeesForSelect(nhanVienList);
      const containersData = formatContainersForSelect(containerList);

      setSelectOptions({
        dauKeo: vehiclesData.dauKeo || [],
        roMooc: vehiclesData.roMooc || [],
        khachHang: customersData || [],
        nhanVien: employeesData || [],
        container: containersData || [],
      });
    } catch (err) {
      setError('Không thể tải dữ liệu Lịch Vận Chuyển.');
      console.error('Error fetching page data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setError, setLichVanChuyenItems, setSelectOptions]);

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

  const handleSave = async event => {
    if (event) event.preventDefault(); // Prevent default form submission if called from an event
    setIsLoading(true);
    setError('');

    if (
      !formData.ma_chuyen ||
      !formData.ngay_di ||
      !formData.trang_thai ||
      !formData.ma_khach_hang ||
      !formData.diem_di ||
      !formData.diem_den ||
      !formData.bien_so_dau_keo ||
      !formData.ma_so_cont ||
      !formData.ma_nv_giao_nhan ||
      !formData.ma_nv_lai_xe
    ) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      setSnackbar({
        open: true,
        message: 'Vui lòng điền đầy đủ các trường bắt buộc.',
        severity: 'warning',
      });
      setIsLoading(false);
      return;
    }

    try {
      if (editingItem) {
        await editLichVanChuyen(editingItem.id, formData);
        setSnackbar({
          open: true,
          message: 'Cập nhật lịch vận chuyển thành công!',
          severity: 'success',
        });
      } else {
        await addLichVanChuyen(formData);
        setSnackbar({
          open: true,
          message: 'Thêm lịch vận chuyển thành công!',
          severity: 'success',
        });
      }
      fetchPageData(); // Refresh data
      handleCloseModal();
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

  const handleDeleteCancel = () => {
    setItemToDelete(null);
    setIsDeleteModalOpen(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    setError('');
    try {
      await removeLichVanChuyen(itemToDelete.id);
      setLichVanChuyenItems(prevItems => prevItems.filter(i => i.id !== itemToDelete.id));
      showSnackbar('Xóa lịch vận chuyển thành công!', 'success');
      setIsDeleteModalOpen(false); // Close modal on success
      setItemToDelete(null); // Clear item to delete
    } catch (err) {
      setError(`Lỗi khi xóa lịch vận chuyển: ${err.message}`);
      showSnackbar(`Lỗi khi xóa: ${err.message}`, 'error');
      console.error('Error deleting LichVanChuyen:', err);
    } finally {
      setIsLoading(false);
    }
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
    if (filtered.length > 0) {
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
  const columns = React.useMemo(
    () => [
      {
        id: 'ma_chuyen',
        header: 'Mã Chuyến',
        width: '7%',
        sortable: true,
        render: (value, row) => row.ma_chuyen || 'N/A',
        sortValue: value => value || '',
      },
      {
        id: 'ngay_di',
        header: 'Ngày Đi',
        width: '7%',
        sortable: true,
        render: (value, row) => (row.ngay_di ? formatDateForDisplay(row.ngay_di) : 'N/A'),
        sortValue: value => value || '',
      },
      {
        id: 'ngay_ha_hang',
        header: 'Ngày Hạ Hàng',
        width: '7%',
        sortable: true,
        render: (value, row) => (row.ngay_ha_hang ? formatDateForDisplay(row.ngay_ha_hang) : 'N/A'),
        sortValue: value => value || '',
      },
      {
        id: 'ma_khach_hang',
        header: 'Khách Hàng',
        width: '15%',
        sortable: true,
        render: (value, row) => {
          try {
            if (!selectOptions.khachHang || selectOptions.khachHang.length === 0) {
              console.warn('khachHang options not loaded yet');
              return row.ma_khach_hang || 'N/A';
            }
            const khachHang = selectOptions.khachHang.find(kh => kh.value === row.ma_khach_hang);
            return khachHang ? khachHang.label : row.ma_khach_hang || 'N/A';
          } catch (error) {
            console.error('Error rendering ma_khach_hang:', error);
            return value || 'N/A';
          }
        },
        sortValue: (value, row) => {
          const khachHang = selectOptions.khachHang.find(kh => kh.value === row.ma_khach_hang);
          return khachHang ? khachHang.label : row.ma_khach_hang || '';
        },
      },
      {
        id: 'bien_so_dau_keo',
        header: 'Xe Vận Chuyển',
        width: '10%',
        sortable: true,
        render: (value, row) => (
          <Box component="span" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {row.bien_so_dau_keo || 'N/A'}
          </Box>
        ),
        sortValue: (value, row) => row.bien_so_dau_keo || '',
      },
      {
        id: 'ghi_chu',
        header: 'Diễn Giải',
        width: '15%',
        sortable: true,
        render: (value, row) => row.ghi_chu || 'N/A',
        sortValue: (value, row) => row.ghi_chu || '',
      },
      {
        id: 'diem_di',
        header: 'Tuyến Đường',
        width: '20%',
        sortable: true,
        render: (value, row) => {
          const diemDi = row.diem_di || 'N/A';
          const diemDen = row.diem_den || 'N/A';
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
        sortValue: (value, row) => `${row.diem_di || ''} ${row.diem_den || ''}`.trim(),
      },
      {
        id: 'cuoc_van_chuyen_vnd',
        header: 'Cước Vận Chuyển',
        align: 'right',
        width: '12%',
        sortable: true,
        render: (value, row) => row.cuoc_van_chuyen_vnd ? formatCurrencyVND(row.cuoc_van_chuyen_vnd) : 'N/A',
        sortValue: (value, row) => row.cuoc_van_chuyen_vnd || 0,
      },
      {
        id: 'vnd_chi_phi',
        header: 'Tổng Chi Phí',
        align: 'right',
        width: '12%',
        sortable: true,
        render: (value, row) => {
          const total =
            (row.vnd_dau || 0) +
            (row.vnd_di_duong || 0) +
            (row.cuoc_van_chuyen_vnd || 0) +
            (row.cuoc_thue_van_chuyen_vnd || 0);
          return formatCurrencyVND(total);
        },
        sortValue: (value, row) =>
          (row.vnd_dau || 0) +
          (row.vnd_di_duong || 0) +
          (row.cuoc_van_chuyen_vnd || 0) +
          (row.cuoc_thue_van_chuyen_vnd || 0),
      },
      {
        id: 'trang_thai',
        header: 'Trạng Thái',
        width: '10%',
        sortable: true,
        render: (value, row) => (
          <Chip
            label={trangThaiMap[row.trang_thai] || row.trang_thai}
            size="small"
            sx={{
              borderRadius: 0.5,
              minWidth: 100,
              backgroundColor: theme =>
                row.trang_thai === 'hoan_thanh'
                  ? theme.palette.success.light
                  : row.trang_thai === 'huy_bo'
                    ? theme.palette.error.light
                    : row.trang_thai === 'dang_di'
                      ? theme.palette.info.light
                      : theme.palette.grey[200],
              color: theme =>
                row.trang_thai === 'hoan_thanh' ||
                row.trang_thai === 'huy_bo' ||
                row.trang_thai === 'dang_di'
                  ? theme.palette.common.white
                  : theme.palette.text.primary,
              fontWeight: 500,
            }}
          />
        ),
        sortValue: value => trangThaiMap[value] || value,
      },
      {
        id: 'ma_nv_lai_xe',
        header: 'Lái Xe',
        width: '10%',
        sortable: true,
        render: (value, row) => {
          const nhanVien = selectOptions.nhanVien.find(nv => nv.value === row.ma_nv_lai_xe);
          return nhanVien ? nhanVien.label : row.ma_nv_lai_xe || 'N/A';
        },
        sortValue: (value, row) => {
          const nhanVien = selectOptions.nhanVien.find(nv => nv.value === row.ma_nv_lai_xe);
          return nhanVien ? nhanVien.label : value || '';
        },
      },
    ],
    [selectOptions.khachHang, selectOptions.nhanVien, theme]
  );
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
