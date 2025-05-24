import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons';
import ConfirmationModal from '@components/ConfirmationModal';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';

// Mock data service - Replace with actual API calls
const mockApi = {
  getContainerTypes: async () => [
    { id: 1, type: "20'DC", description: 'Container khô 20 feet tiêu chuẩn' },
    { id: 2, type: "40'DC", description: 'Container khô 40 feet tiêu chuẩn' },
    { id: 3, type: "40'HC", description: 'Container cao 40 feet' },
    { id: 4, type: "40'RF", description: 'Container lạnh 40 feet' },
    { id: 5, type: "40'OT", description: 'Container mở nóc 40 feet' },
    { id: 6, type: "45'HC", description: 'Container cao 45 feet' },
  ],
  addContainerType: async data => ({ id: Date.now(), ...data }),
  updateContainerType: async (id, data) => ({ id, ...data }),
  deleteContainerType: async id => id,
};

const LoaiContainer = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedContainerType, setSelectedContainerType] = useState(null);
  const [containerTypeToDelete, setContainerTypeToDelete] = useState(null);
  const [formData, setFormData] = useState({ type: '', description: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchContainerTypes = async () => {
    setIsLoading(true);
    try {
      const data = await mockApi.getContainerTypes();
      setContainerTypes(data);
    } catch (err) {
      setError('Không thể tải danh sách loại container');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContainerTypes();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModalForAdd = () => {
    setSelectedContainerType(null);
    setFormData({ type: '', description: '' });
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = containerType => {
    setSelectedContainerType(containerType);
    setFormData({
      type: containerType.type,
      description: containerType.description || '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedContainerType(null);
    setFormData({ type: '', description: '' });
    setError('');
  }, []);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, handleCloseModal]);

  const handleSave = async e => {
    e.preventDefault();
    if (!formData.type.trim()) {
      setError('Vui lòng nhập loại container');
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        type: formData.type.trim(),
        description: formData.description.trim(),
      };

      if (selectedContainerType) {
        await mockApi.updateContainerType(selectedContainerType.id, data);
      } else {
        await mockApi.addContainerType(data);
      }
      await fetchContainerTypes();
      handleCloseModal();
    } catch (err) {
      setError('Đã xảy ra lỗi khi lưu loại container');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = containerType => {
    setContainerTypeToDelete(containerType);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await mockApi.deleteContainerType(containerTypeToDelete.id);
      setContainerTypes(containerTypes.filter(ct => ct.id !== containerTypeToDelete.id));
      setIsDeleteModalOpen(false);
      setContainerTypeToDelete(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setContainerTypeToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Danh sách loại container</h1>
        <button
          onClick={handleOpenModalForAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                STT
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loại Container
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mô Tả
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao Tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && containerTypes.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && error && containerTypes.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && containerTypes.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  Chưa có loại container nào.
                </td>
              </tr>
            )}
            {containerTypes.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.type}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModalForEdit(item)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(item)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        sx={{
          '& .MuiDialog-container': {
            alignItems: 'flex-start',
            paddingTop: '64px',
          },
          '& .MuiPaper-root': {
            margin: '16px',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          },
          '& .MuiDialogTitle-root': {
            padding: '16px 24px',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#111827',
            borderBottom: '1px solid #E5E7EB',
          },
          '& .MuiDialogContent-root': {
            padding: '24px',
            '&:first-of-type': {
              paddingTop: '24px',
            },
          },
          '& .MuiDialogActions-root': {
            padding: '16px 24px',
            borderTop: '1px solid #E5E7EB',
            justifyContent: 'flex-end',
            gap: '8px',
          },
        }}
      >
        <DialogTitle>
          {selectedContainerType ? 'Chỉnh sửa loại container' : 'Thêm loại container mới'}
        </DialogTitle>
        <form onSubmit={handleSave}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                label="Loại container"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                placeholder="Ví dụ: 20'DC"
                variant="outlined"
                size="small"
                required
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mô tả"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Ví dụ: Container khô 20 feet tiêu chuẩn"
                variant="outlined"
                size="small"
              />
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCloseModal}
              variant="outlined"
              sx={{
                height: 36,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 500,
              }}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              sx={{
                height: 36,
                px: 2,
                fontSize: '0.8125rem',
                fontWeight: 500,
                '&:hover': {
                  backgroundColor: '#1d4ed8',
                },
              }}
            >
              {selectedContainerType ? 'Lưu' : 'Thêm'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-4">
              Bạn có chắc chắn muốn xóa loại container này?
            </p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-gray-500">Loại container:</div>
                <div className="text-gray-900">{containerTypeToDelete?.type}</div>
                <div className="font-medium text-gray-500">Mô tả:</div>
                <div className="text-gray-900">{containerTypeToDelete?.description || '-'}</div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default LoaiContainer;
