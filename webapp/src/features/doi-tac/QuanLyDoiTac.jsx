import React, { useState, useEffect } from 'react';
import {
  getPartners,
  addPartner,
  updatePartner,
  deletePartner,
} from '../../services/mockData/partners.js';
import { AddButton, EditButton, DeleteButton } from '@shared/components/ActionButtons';
import StandardTable from '@shared/components/StandardTable';
import ConfirmationModal from '@shared/components/ConfirmationDialog';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
} from '@mui/material';

const initialFormState = {
  code: '',
  name: '',
  address: '',
  taxCode: '',
};

const QuanLyDoiTac = () => {
  const [partners, setPartners] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPartnersData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getPartners();
      setPartners(data);
    } catch (err) {
      setError('Không thể tải danh sách đối tác.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnersData();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModalForAdd = () => {
    setSelectedPartner(null);
    setFormData(initialFormState);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = partner => {
    setSelectedPartner(partner);
    setFormData({
      code: partner.code,
      name: partner.name,
      address: partner.address,
      taxCode: partner.taxCode,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPartner(null);
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

  const handleSavePartner = async e => {
    e.preventDefault();
    setError('');
    if (
      !formData.code.trim() ||
      !formData.name.trim() ||
      !formData.address.trim() ||
      !formData.taxCode.trim()
    ) {
      setError('Vui lòng điền đầy đủ thông tin đối tác.');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedPartner) {
        await updatePartner(selectedPartner.id, formData);
      } else {
        await addPartner(formData);
      }
      await fetchPartnersData();
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${selectedPartner ? 'cập nhật' : 'thêm'} đối tác.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = partner => {
    setPartnerToDelete(partner);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deletePartner(partnerToDelete.id);
      setPartners(partners.filter(p => p.id !== partnerToDelete.id));
      setIsDeleteModalOpen(false);
      setPartnerToDelete(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setPartnerToDelete(null);
  };

  // Define table columns
  const columns = [
    {
      key: 'code',
      label: 'Mã',
    },
    {
      key: 'name',
      label: 'Tên',
    },
    {
      key: 'address',
      label: 'Địa chỉ',
    },
    {
      key: 'taxCode',
      label: 'Mã số thuế',
    },
    {
      key: 'actions',
      label: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <EditButton onClick={() => handleOpenModalForEdit(record)} disabled={isLoading} />
          <DeleteButton onClick={() => handleDeleteClick(record)} disabled={isLoading} />
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        component="h1"
        sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}
      >
        Danh sách đối tác
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 2 }}>
        <StandardTable
          columns={columns}
          data={partners}
          loading={isLoading}
          emptyMessage="Không có dữ liệu đối tác"
          headerAction={<AddButton onClick={handleOpenModalForAdd} size="small" sx={{ ml: 2 }} />}
        />
      </Paper>

      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedPartner ? 'Chỉnh sửa đối tác' : 'Thêm đối tác mới'}</DialogTitle>
        <form onSubmit={handleSavePartner}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Mã"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                placeholder="Ví dụ: CDMC"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              <TextField
                label="Tên"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ví dụ: Công ty Cổ phần Chè"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              <TextField
                label="Địa chỉ"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Ví dụ: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              <TextField
                label="Mã số thuế"
                name="taxCode"
                value={formData.taxCode}
                onChange={handleInputChange}
                placeholder="Ví dụ: 5500157123"
                fullWidth
                size="small"
                required
                margin="normal"
              />
              {error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button onClick={handleCloseModal} color="inherit">
              Hủy
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {selectedPartner ? 'Lưu' : 'Thêm'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmationModal
        open={isDeleteModalOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa đối tác"
        message={
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bạn có chắc chắn muốn xóa đối tác này?
            </Typography>
            <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: 1,
                  fontSize: '0.875rem',
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Mã đối tác:
                </Typography>
                <Typography variant="body2">{partnerToDelete?.code}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Tên đối tác:
                </Typography>
                <Typography variant="body2">{partnerToDelete?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Địa chỉ:
                </Typography>
                <Typography variant="body2">{partnerToDelete?.address}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Mã số thuế:
                </Typography>
                <Typography variant="body2">{partnerToDelete?.taxCode}</Typography>
              </Box>
            </Box>
          </Box>
        }
        confirmText="Xóa"
        cancelText="Hủy"
        confirmColor="error"
      />
    </Box>
  );
};

export default QuanLyDoiTac;
