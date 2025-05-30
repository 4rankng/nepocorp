import { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  fetchAllNhanVien,
  addNhanVien,
  editNhanVien,
  removeNhanVien,
  fetchAllDauKeo,
} from '@services/mockApi/index.js';
// Configuration
const DEFAULT_PAGE_SIZE = 10;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Error boundary fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div role="alert" className="p-4 bg-red-50 rounded-lg">
    <h3 className="text-lg font-medium text-red-800">Đã xảy ra lỗi</h3>
    <p className="text-red-700">{error.message}</p>
    <button
      onClick={resetErrorBoundary}
      className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
    >
      Thử lại
    </button>
  </div>
);
// Retry utility function
const withRetry = async (fn, retries = MAX_RETRY_ATTEMPTS, delay = RETRY_DELAY) => {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
  }
};
// Define employee roles constant
const employeeRoles = [
  { value: 'giao-nhan', label: 'Giao Nhận' },
  { value: 'lai-xe', label: 'Lái Xe' },
  { value: 'quan-ly', label: 'Quản Lý' },
  { value: 'admin', label: 'Admin' },
];
const getInitialFormState = () => ({
  ma_so: '',
  ho_ten: '',
  ten_dang_nhap: '',
  mat_khau: '',
  chuc_vu: '',
  email: '',
});
const useNhanVien = (initialPage = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  // State management
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(getInitialFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [dauKeoList, setDauKeoList] = useState([]);
  const [isDauKeoLoading, setIsDauKeoLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: initialPage,
    pageSize,
    total: 0,
    totalPages: 0,
  });
  const cacheRef = useRef({
    employees: { data: [], timestamp: 0, total: 0 },
    dauKeo: { data: [], timestamp: 0 },
  });
  const errorBoundaryRef = useRef();
  // Clear error function
  const clearError = useCallback(() => {
    setError('');
  }, []);
  const fetchEmployeesData = useCallback(
    async (page = pagination.page, size = pagination.pageSize) => {
      setIsLoading(true);
      setError('');
      const cacheKey = `page-${page}-size-${size}`;
      try {
        const now = Date.now();
        const cachedData = cacheRef.current.employees;
        // Return cached data if valid
        if (cachedData.timestamp && now - cachedData.timestamp < CACHE_TTL) {
          setEmployees(cachedData.data);
          setPagination(prev => ({
            ...prev,
            total: cachedData.total || 0,
            totalPages: Math.ceil((cachedData.total || 0) / size),
          }));
          return;
        }
        // Fetch with retry logic
        const response = await withRetry(() => fetchAllNhanVien(page, size));

        // Extract data from API response
        const items = response?.data || [];
        const total = response?.meta?.totalItems || 0;

        // Map backend fields to UI fields
        const mapped = items.map(emp => ({
          ...emp,
          maNhanVien: emp.ma_so,
          tenNhanVien: emp.ho_ten,
          tenDangNhap: emp.ten_dang_nhap,
          chucVu: mapChucVu(emp.chuc_vu),
        }));

        // Update cache
        cacheRef.current.employees = {
          data: mapped,
          total: total,
          timestamp: now,
        };

        // Update state
        setEmployees(mapped);
        setPagination(prev => ({
          ...prev,
          page,
          pageSize: size,
          total: total,
          totalPages: Math.ceil(total / size),
        }));
      } catch (err) {
        const errorMsg = err?.message || 'Không thể tải danh sách nhân viên.';
        setError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.page, pagination.pageSize]
  );
  // Handle page change
  const handlePageChange = useCallback(
    (newPage, newPageSize) => {
      return fetchEmployeesData(newPage, newPageSize);
    },
    [fetchEmployeesData]
  );
  // Lazy load dau keo list for driver assignment
  const loadDauKeoList = useCallback(async () => {
    if (isDauKeoLoading) return; // Prevent multiple simultaneous calls

    setIsDauKeoLoading(true);
    try {
      const now = Date.now();
      const cachedData = cacheRef.current.dauKeo;

      // Return cached data if valid
      if (cachedData.timestamp && now - cachedData.timestamp < CACHE_TTL) {
        setDauKeoList(cachedData.data);
        return;
      }

      const response = await withRetry(() => fetchAllDauKeo());
      const dauKeoData = response?.data || [];

      const mappedDauKeo = dauKeoData.map(item => ({
        ...item,
        label: `${item.bien_so} - ${item.loai_xe || 'Đầu kéo'}`,
        value: item.id,
      }));

      // Update cache
      cacheRef.current.dauKeo = {
        data: mappedDauKeo,
        timestamp: now,
      };

      setDauKeoList(mappedDauKeo);
    } catch (err) {
      console.error('Error loading dau keo list:', err);
      setDauKeoList([]);
    } finally {
      setIsDauKeoLoading(false);
    }
  }, [isDauKeoLoading]);
  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);
  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);
  const generateEmployeeCode = useCallback(employees => {
    // Find the highest employee code
    const maxCode = employees.reduce((max, emp) => {
      if (!emp.maNhanVien) return max;
      const num = parseInt(emp.maNhanVien.replace(/^NV0*/i, ''), 10);
      return !isNaN(num) ? Math.max(max, num) : max;
    }, 0);
    // Generate new code with leading zeros (e.g., NV001, NV002, ...)
    return `NV${String(maxCode + 1).padStart(3, '0')}`;
  }, []);
  const handleOpenModalForAdd = useCallback(() => {
    setEditingEmployee(null);
    // Generate new employee code based on existing employees
    const newCode = generateEmployeeCode(employees);
    setFormData({
      ...getInitialFormState(),
      ma_so: newCode,
    });
    setError('');
    setIsModalOpen(true);
  }, [employees, generateEmployeeCode]);
  const handleOpenModalForEdit = useCallback(employee => {
    setEditingEmployee(employee);
    setFormData({
      ma_so: employee.maNhanVien || '',
      ho_ten: employee.tenNhanVien || '',
      ten_dang_nhap: employee.tenDangNhap || '',
      mat_khau: '', // Password field is cleared for edit
      chuc_vu: employee.chucVu || '',
      email: employee.email || '',
    });
    setError('');
    setIsModalOpen(true);
  }, []);
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormData(getInitialFormState());
    setError('');
  }, []);
  // Effect for ESC key to close modal
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleCloseModal]);
  const handleSaveEmployee = useCallback(async () => {
    setError('');
    if (
      !formData.ho_ten.trim() ||
      !formData.ten_dang_nhap.trim() ||
      !formData.email.trim() ||
      !formData.chuc_vu.trim()
    ) {
      setError('Vui lòng điền đầy đủ các trường: Tên nhân viên, Tên đăng nhập, Email, Chức vụ.');
      return;
    }
    if (!editingEmployee && !formData.mat_khau.trim()) {
      setError('Mật khẩu là bắt buộc khi thêm nhân viên mới.');
      return;
    }
    setIsLoading(true);
    try {
      if (editingEmployee) {
        const dataToUpdate = { ...formData };
        if (!formData.mat_khau.trim()) {
          delete dataToUpdate.mat_khau;
        }
        await editNhanVien(editingEmployee.id, dataToUpdate);
      } else {
        await addNhanVien(formData);
      }
      await fetchEmployeesData(); // Refresh data
      handleCloseModal(); // Close modal on success
    } catch (err) {
      setError(err.message || `Lỗi khi ${editingEmployee ? 'sửa' : 'thêm'} nhân viên.`);
      console.error(err);
      // Do not close modal on error, so user can see the error
    } finally {
      setIsLoading(false);
    }
  }, [formData, editingEmployee, fetchEmployeesData, handleCloseModal]);
  const handleDeleteEmployee = useCallback(
    async id => {
      // Renamed to avoid conflict if used directly
      // Confirmation can be handled in the component or passed as a callback
      // For simplicity, direct deletion logic here, assuming confirm is done before calling
      setIsLoading(true);
      setError('');
      try {
        await removeNhanVien(id);
        await fetchEmployeesData(); // Refresh data
      } catch (err) {
        setError('Lỗi khi xóa nhân viên.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchEmployeesData]
  );
  // Wrap component with error boundary
  const withErrorBoundary = children => (
    <ErrorBoundary ref={errorBoundaryRef} FallbackComponent={ErrorFallback} onReset={clearError}>
      {children}
    </ErrorBoundary>
  );
  return {
    employees,
    isModalOpen,
    editingEmployee,
    formData,
    isLoading,
    error,
    dauKeoList,
    isDauKeoLoading,
    pagination,
    employeeRoles,
    fetchEmployeesData,
    loadDauKeoList,
    handleInputChange,
    handleOpenModalForAdd,
    handleOpenModalForEdit,
    handleCloseModal,
    handleSaveEmployee,
    handleDeleteEmployee,
    handlePageChange,
    withErrorBoundary,
    clearError,
  };
};
// Helper to map chuc_vu code to display string
function mapChucVu(code) {
  switch (code) {
    case 'quan-ly':
      return 'Quản lý';
    case 'ke-toan':
      return 'Kế toán';
    case 'giao-nhan':
      return 'Giao nhận';
    case 'lai-xe':
      return 'Lái xe';
    default:
      return code || 'Chưa xác định';
  }
}
export default useNhanVien;
