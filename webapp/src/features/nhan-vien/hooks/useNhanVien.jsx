import { useState, useEffect, useCallback, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  fetchAllNhanVien,
  addNhanVien,
  editNhanVien,
  removeNhanVien,
} from '../../../services/api/nhanVienApi';
import { useAuth } from '@contexts/AuthContext';
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
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'driver', label: 'Driver' },
  { value: 'receiver', label: 'Receiver' },
];
const getInitialFormState = () => ({
  username: '',
  name: '',
  email: '',
  password: '',
  role: '',
});
const useNhanVien = (initialPage = 1, pageSize = DEFAULT_PAGE_SIZE) => {
  const { currentUser, updateCurrentUser } = useAuth();

  // State management
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(getInitialFormState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: initialPage,
    pageSize,
    total: 0,
    totalPages: 0,
  });
  const cacheRef = useRef({
    employees: { data: [], timestamp: 0, total: 0 },
  });

  // Cache invalidation method
  const invalidateCache = useCallback(() => {
    cacheRef.current.employees.timestamp = 0;
  }, []);
  const errorBoundaryRef = useRef();
  // Clear error function
  const clearError = useCallback(() => {
    setError('');
  }, []);
  const fetchEmployeesData = useCallback(
    async (page = pagination.page, size = pagination.pageSize, forceRefresh = false) => {
      setIsLoading(true);
      setError('');
      const cacheKey = `page-${page}-size-${size}`;
      try {
        const now = Date.now();
        const cachedData = cacheRef.current.employees;
        // Return cached data if valid and not forcing refresh
        if (!forceRefresh && cachedData.timestamp && now - cachedData.timestamp < CACHE_TTL) {
          setEmployees(cachedData.data);
          setPagination(prev => ({
            ...prev,
            total: cachedData.total || 0,
            totalPages: Math.ceil((cachedData.total || 0) / size),
          }));
          return;
        }

        const response = await withRetry(() => fetchAllNhanVien(page, size));

        if (response.status !== 'success') {
          throw new Error(response.message || 'Failed to fetch employees');
        }

        const employeesData = response.data || [];
        const total = response.pagination?.records_count || employeesData.length;

        // Update cache
        cacheRef.current.employees = {
          data: employeesData,
          timestamp: now,
          total: total,
        };

        setEmployees(employeesData);
        setPagination(prev => ({
          ...prev,
          page,
          pageSize: size,
          total,
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
  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);
  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);
  const handleOpenModalForAdd = useCallback(() => {
    setEditingEmployee(null);
    setFormData(getInitialFormState());
    setError('');
    setIsModalOpen(true);
  }, []);
  const handleOpenModalForEdit = useCallback(employee => {
    setEditingEmployee(employee);
    setFormData({
      username: employee.username || '',
      name: employee.name || '',
      email: employee.email || '',
      password: '', // Password field is cleared for edit
      role: employee.role || '',
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
      !formData.name.trim() ||
      !formData.username.trim() ||
      !formData.email.trim() ||
      !formData.role.trim()
    ) {
      setError('Vui lòng điền đầy đủ các trường: Tên nhân viên, Tên đăng nhập, Email, Chức vụ.');
      return;
    }
    if (!editingEmployee && !formData.password.trim()) {
      setError('Mật khẩu là bắt buộc khi thêm nhân viên mới.');
      return;
    }
    setIsLoading(true);
    try {
      // Filter out backend-managed fields before sending
      const { ...userData } = formData;
      // Remove password if empty during edit (don't change password)
      if (editingEmployee && !userData.password?.trim()) {
        delete userData.password;
      }

      let response;
      if (editingEmployee) {
        response = await editNhanVien(editingEmployee.id, userData);
      } else {
        response = await addNhanVien(userData);
      }

      if (response.status !== 'success') {
        throw new Error(
          response.message || `Failed to ${editingEmployee ? 'update' : 'create'} employee`
        );
      }

      // If editing current user, update the auth context
      if (editingEmployee && currentUser && editingEmployee.id === currentUser.id) {
        updateCurrentUser(response.data);
      }

      // Invalidate cache and refresh employee list with fresh data
      invalidateCache();
      await fetchEmployeesData(pagination.page, pagination.pageSize, true);
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${editingEmployee ? 'sửa' : 'thêm'} nhân viên.`);
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
        const response = await removeNhanVien(id);

        if (response.status !== 'success') {
          throw new Error(response.message || 'Failed to delete employee');
        }

        // Invalidate cache and refresh employee list with fresh data
        invalidateCache();
        await fetchEmployeesData(pagination.page, pagination.pageSize, true);
      } catch (err) {
        setError(err.message || 'Lỗi khi xóa nhân viên.');
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
    pagination,
    employeeRoles,
    fetchEmployeesData,
    invalidateCache,
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
export default useNhanVien;
