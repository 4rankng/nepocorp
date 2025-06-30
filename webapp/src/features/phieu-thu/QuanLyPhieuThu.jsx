import React, { useState, useContext, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import InvoiceForm from '@/components/shared/InvoiceForm';
import InvoiceList from '@/components/shared/InvoiceList';
import InvoiceViewModal from '@/components/InvoiceViewModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import useInvoices from './hooks/useInvoices';
import useInvoiceForm from '@/hooks/useInvoiceForm';
import { invoiceApi } from '@services/api/invoiceApi';
import { Snackbar, Alert } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { INVOICE_STATUS_LABELS } from '@constants/invoice';
import FAB from '@/components/FAB';

const QuanLyPhieuThu = () => {
  const { currentUser } = useAuth();
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);

  // Helper functions
  const formatCurrency = value => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = dateString => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, invoice: null });
  const [isDeletingInvoice, setIsDeletingInvoice] = useState(false);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  // Snackbar handlers
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const { invoices, categories, isLoading, error, deleteInvoice, pagination } = useInvoices();

  // Transform invoice data for editing (from API format to form format)
  const transformInvoiceForForm = invoice => {
    if (!invoice) return null;

    return {
      id: invoice.id,
      customer_id: invoice.customer_id || '',
      invoice_category_id: invoice.invoice_category_id || '',
      payment_status: invoice.payment_status || 'DRAFT',
      payment_proof: invoice.payment_proof || '',
      remark: invoice.remark || '',
      cancel_reason: invoice.cancel_reason || '',
      items: invoice.items?.map(item => ({
        id: item.id,
        license_plate: item.license_plate || '',
        item_name: item.item_name || '',
        price: item.price?.toString() || '',
        quantity: item.quantity?.toString() || '1',
        service_date: item.service_date ? item.service_date.split('T')[0] : '',
        notes: item.notes || '',
      })) || [
        {
          license_plate: '',
          item_name: '',
          price: '',
          quantity: '1',
          service_date: '',
          notes: '',
        },
      ],
    };
  };

  // Get license plates for dropdown
  const getAllLicensePlates = () => {
    const tractorPlates = tractors.map(t => ({
      value: t.license_plate,
      displayText: `${t.license_plate} (Đầu kéo)`,
      type: 'tractor',
    }));

    const trailerPlates = trailers.map(t => ({
      value: t.license_plate,
      displayText: `${t.license_plate} (Rơ moóc)`,
      type: 'trailer',
    }));

    return [...tractorPlates, ...trailerPlates];
  };

  // Get initial form data based on mode
  const getInitialFormData = () => {
    if (editingInvoice) {
      return transformInvoiceForForm(editingInvoice);
    }
    return {
      customer_id: '',
      invoice_category_id: '',
      payment_status: 'DRAFT',
      payment_proof: '',
      remark: '',
      cancel_reason: '',
      items: [
        {
          license_plate: '',
          item_name: '',
          price: '',
          quantity: '1',
          service_date: '',
          notes: '',
        },
      ],
    };
  };

  // Memoize the initial form data to prevent unnecessary recreations
  const initialFormData = useMemo(() => getInitialFormData(), [editingInvoice]);

  // Single form manager that updates based on editing state
  const formManager = useInvoiceForm({
    initialFormData,
    onSuccess: message => {
      showSnackbar(message, 'success');
      // Only close modal on actual success
      setShowInvoiceForm(false);
      setEditingInvoice(null);
    },
    onError: error => {
      showSnackbar(error.message, 'error');
      // NEVER close modal on errors - user should be able to fix and retry
    },
    fetchData: pagination.onPageChange ? () => pagination.onPageChange(pagination.page) : null,
    isEdit: !!editingInvoice,
    api: invoiceApi,
  });

  const handleAddInvoice = useCallback(async () => {
    setEditingInvoice(null);
    setShowInvoiceForm(true);
    // Ensure vehicle data is loaded
    await fetchTractors();
    await fetchTrailers();
  }, [fetchTractors, fetchTrailers]);

  const handleEditInvoice = useCallback(
    async invoice => {
      try {
        // Show loading state while fetching full invoice data
        showSnackbar('Đang tải thông tin phiếu thu...', 'info');

        // Fetch full invoice data including items
        const response = await invoiceApi.getById(invoice.id);
        const fullInvoiceData = response.data?.data || response.data || response;

        // Set the full invoice data for editing
        setEditingInvoice(fullInvoiceData);
        setShowInvoiceForm(true);

        // Ensure vehicle data is loaded
        await fetchTractors();
        await fetchTrailers();
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        showSnackbar('Không thể tải thông tin phiếu thu', 'error');
      }
    },
    [fetchTractors, fetchTrailers, showSnackbar]
  );

  const handleViewInvoice = useCallback(invoice => {
    setViewingInvoiceId(invoice.id);
    setShowInvoiceModal(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowInvoiceForm(false);
    setEditingInvoice(null);
  }, []);

  const handleCloseInvoiceModal = useCallback(() => {
    setShowInvoiceModal(false);
    setViewingInvoiceId(null);
  }, []);

  const handleDeleteInvoice = useCallback(invoice => {
    setDeleteDialog({ open: true, invoice });
  }, []);

  const handleDeleteClose = useCallback(() => {
    setDeleteDialog({ open: false, invoice: null });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.invoice) return;

    setIsDeletingInvoice(true);
    try {
      await deleteInvoice(deleteDialog.invoice.id);
      showSnackbar('Xóa phiếu thu thành công', 'success');
      handleDeleteClose();
    } catch (error) {
      showSnackbar('Không thể xóa phiếu thu', 'error');
    } finally {
      setIsDeletingInvoice(false);
    }
  }, [deleteDialog.invoice, deleteInvoice, showSnackbar, handleDeleteClose]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <InvoiceForm
          open={showInvoiceForm}
          isEdit={!!editingInvoice}
          isLoading={formManager.isLoading}
          formData={formManager.formData}
          errors={formManager.errors}
          onClose={handleCloseForm}
          onChange={formManager.handleInputChange}
          onSave={formManager.handleSave}
          licensePlates={getAllLicensePlates()}
          isLoadingPlates={false}
          title={editingInvoice ? 'Sửa phiếu thu' : 'Thêm phiếu thu mới'}
        />
      )}

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow">
        <InvoiceList
          invoices={invoices}
          categories={categories}
          loading={isLoading}
          error={error}
          onView={handleViewInvoice}
          onEdit={handleEditInvoice}
          onDelete={handleDeleteInvoice}
          pagination={pagination}
          currentUser={currentUser}
        />
      </div>

      {/* Invoice View Modal - Conditional rendering to prevent unnecessary re-renders */}
      {showInvoiceModal && (
        <InvoiceViewModal
          open={true}
          onClose={handleCloseInvoiceModal}
          invoiceId={viewingInvoiceId}
        />
      )}

      {/* FAB Button */}
      {!showInvoiceForm && !showInvoiceModal && (
        <FAB onClick={handleAddInvoice} icon={<AddIcon />} ariaLabel="Thêm" />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onCancel={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeletingInvoice}
        type="delete"
        title="Xóa phiếu thu"
        message="Bạn có chắc chắn muốn xóa phiếu thu này?"
        details={
          deleteDialog.invoice
            ? {
                'Khách hàng': deleteDialog.invoice.customer?.name || '-',
                'Loại phiếu thu': (() => {
                  const category = categories.find(
                    cat => cat.id === deleteDialog.invoice.invoice_category_id
                  );
                  return category ? category.name : '-';
                })(),
                'Tổng tiền': formatCurrency(deleteDialog.invoice.total || 0),
                'Trạng thái':
                  INVOICE_STATUS_LABELS[deleteDialog.invoice.payment_status] ||
                  deleteDialog.invoice.payment_status ||
                  '-',
                'Ngày tạo': formatDate(deleteDialog.invoice.created_at),
                ...(deleteDialog.invoice.remark && { 'Ghi chú': deleteDialog.invoice.remark }),
                ...(deleteDialog.invoice.cancel_reason && {
                  'Lý do hủy': deleteDialog.invoice.cancel_reason,
                }),
              }
            : null
        }
      />
    </div>
  );
};

export default QuanLyPhieuThu;
