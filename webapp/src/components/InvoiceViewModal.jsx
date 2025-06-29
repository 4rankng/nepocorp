import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import { invoiceApi } from '@services/api/invoiceApi';
import { invoiceCategoryApi } from '@services/api/invoiceCategoryApi';
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from '@constants/invoice';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import LicensePlateSelectionModal from './LicensePlateSelectionModal';
import ExpenseHeader from './expense/ExpenseHeader';
import ExpenseBasicInfo from './expense/ExpenseBasicInfo';
import ExpenseOptionalSections from './expense/ExpenseOptionalSections';
import ExpenseItemsTable from './expense/ExpenseItemsTable';
import ExpenseActionButtons from './expense/ExpenseActionButtons';
import StatusChangePrompts from '@components/shared/modals/StatusChangePrompts';
import { Z_INDEX } from '@constants/zIndex';
import { prepareInvoiceItemsForUpdate, calculateInvoiceTotal } from '@utils/invoiceHelpers';

const InvoiceViewModal = ({ open, onClose, invoiceId }) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);
  const [isItemEditModalOpen, setIsItemEditModalOpen] = useState(false);
  const [showItemEditModal, setShowItemEditModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  // Status change prompts
  const [showPaymentProofPrompt, setShowPaymentProofPrompt] = useState(false);
  const [showCancelReasonPrompt, setShowCancelReasonPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [tempPaymentProof, setTempPaymentProof] = useState('');
  const [tempCancelReason, setTempCancelReason] = useState('');

  // Memoized status options to prevent recreation on every render
  const statusOptions = useMemo(() =>
    Object.entries(INVOICE_STATUS).map(([, value]) => ({
      value: value,
      label: INVOICE_STATUS_LABELS[value]
    })), []
  );

  // Memoized calculated total
  const calculatedTotal = useMemo(() => {
    if (isEditing && editedData?.items) {
      return calculateInvoiceTotal(editedData.items);
    }
    return invoiceData?.total || 0;
  }, [isEditing, editedData?.items, invoiceData?.total]);

  // Get license plates for dropdown - memoized to prevent re-creation
  const getAllLicensePlates = useMemo(() => {
    const tractorPlates = tractors.map(t => ({
      value: t.license_plate,
      label: t.license_plate,
      type: 'tractor'
    }));

    const trailerPlates = trailers.map(t => ({
      value: t.license_plate,
      label: t.license_plate,
      type: 'trailer'
    }));

    return [...tractorPlates, ...trailerPlates];
  }, [tractors, trailers]);

  const fetchInvoiceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await invoiceApi.getById(invoiceId);
      const invoiceData = response.data?.data || response.data || response;

      // Ensure items is always an array
      if (invoiceData && !Array.isArray(invoiceData.items)) {
        invoiceData.items = invoiceData.items ? [invoiceData.items] : [];
      }

      setInvoiceData(invoiceData);
    } catch (err) {
      setError('Không thể tải thông tin phiếu thu');
      console.error('Error fetching invoice data:', err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoiceData();
    }
  }, [open, invoiceId, fetchInvoiceData]);

  // Fetch invoice categories when entering edit mode
  useEffect(() => {
    if (isEditing && invoiceCategories.length === 0) {
      setIsLoadingCategories(true);
      invoiceCategoryApi.getAllWithoutPagination()
        .then(response => {
          const categories = response.data?.data || response.data || [];
          setInvoiceCategories(categories);
        })
        .catch(err => {
          console.error('Error fetching invoice categories:', err);
        })
        .finally(() => {
          setIsLoadingCategories(false);
        });
    }
  }, [isEditing, invoiceCategories.length]);

  // Fetch vehicles when entering edit mode
  useEffect(() => {
    if (isEditing && (tractors.length === 0 || trailers.length === 0)) {
      setIsLoadingPlates(true);
      Promise.all([
        fetchTractors(),
        fetchTrailers()
      ])
        .catch(err => {
          console.error('Error fetching vehicles:', err);
        })
        .finally(() => {
          setIsLoadingPlates(false);
        });
    }
  }, [isEditing, tractors.length, trailers.length, fetchTractors, fetchTrailers]);

  const handleClose = useCallback(() => {
    setInvoiceData(null);
    setError(null);
    setIsEditing(false);
    setEditedData(null);
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
    onClose();
  }, [onClose]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setEditedData({
      ...invoiceData,
      items: invoiceData.items.map(item => ({ ...item }))
    });
  }, [invoiceData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
  }, []);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open && !showLicensePlateModal && !isItemEditModalOpen) {
        if (isEditing) {
          handleCancelEdit();
        } else {
          handleClose();
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, isEditing, handleCancelEdit, handleClose, showLicensePlateModal, isItemEditModalOpen]);

  const handleFieldChange = useCallback((field, value) => {
    // Handle status changes that require prompts
    if (field === 'payment_status') {
      const oldStatus = editedData?.payment_status;

      if (value === INVOICE_STATUS.PAID && oldStatus !== INVOICE_STATUS.PAID) {
        setPendingStatus(value);
        setTempPaymentProof(editedData?.payment_proof || '');
        setShowPaymentProofPrompt(true);
        return;
      }

      if (value === INVOICE_STATUS.CANCELLED && oldStatus !== INVOICE_STATUS.CANCELLED) {
        setPendingStatus(value);
        setTempCancelReason(editedData?.cancel_reason || '');
        setShowCancelReasonPrompt(true);
        return;
      }
    }

    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  }, [editedData?.payment_status, editedData?.payment_proof, editedData?.cancel_reason]);

  // Handle payment proof confirmation
  const handlePaymentProofConfirm = useCallback(() => {
    if (!tempPaymentProof.trim()) {
      alert('Vui lòng nhập URL chứng từ thanh toán');
      return;
    }

    setEditedData(prev => ({
      ...prev,
      payment_status: pendingStatus,
      payment_proof: tempPaymentProof,
      cancel_reason: null // Clear cancel reason when marking as paid
    }));

    setShowPaymentProofPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
  }, [tempPaymentProof, pendingStatus]);

  // Handle cancel reason confirmation
  const handleCancelReasonConfirm = useCallback(() => {
    if (!tempCancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy');
      return;
    }

    setEditedData(prev => ({
      ...prev,
      payment_status: pendingStatus,
      cancel_reason: tempCancelReason,
      payment_proof: null // Clear payment proof when cancelling
    }));

    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempCancelReason('');
  }, [tempCancelReason, pendingStatus]);

  // Handle prompt cancellation
  const handlePromptCancel = useCallback(() => {
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Calculate totals for items
      const updatedItems = prepareInvoiceItemsForUpdate(editedData.items || []);
      const totalAmount = calculateInvoiceTotal(updatedItems);

      const updateData = {
        customer_id: editedData.customer_id,
        invoice_category_id: editedData.invoice_category_id,
        payment_status: editedData.payment_status,
        payment_proof: editedData.payment_proof || null,
        cancel_reason: editedData.cancel_reason || null,
        remark: editedData.remark,
        items: updatedItems,
        total: totalAmount
      };

      await invoiceApi.update(invoiceId, updateData);

      // Refresh the invoice data
      await fetchInvoiceData();
      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      setError('Không thể cập nhật phiếu thu');
      console.error('Error updating invoice:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, invoiceId, fetchInvoiceData]);

  const handleItemChange = useCallback((index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const handleAddItem = useCallback(() => {
    setEditingItemIndex(null);
    setShowItemEditModal(true);
  }, []);

  const handleDeleteItem = useCallback((index) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }, []);

  const handleLicensePlateCellClick = useCallback((index) => {
    setCurrentLicensePlateIndex(index);
    setShowLicensePlateModal(true);
  }, []);

  const handleLicensePlateSelect = useCallback((selectedPlate) => {
    if (currentLicensePlateIndex !== null) {
      setEditedData(prev => {
        const updatedItems = prev.items.map((item, i) => {
          if (i === currentLicensePlateIndex) {
            return { ...item, license_plate: selectedPlate };
          }
          return item;
        });

        // Prefill other empty license plate cells
        const prefilledItems = updatedItems.map(item => {
          if (!item.license_plate) {
            return { ...item, license_plate: selectedPlate };
          }
          return item;
        });

        return { ...prev, items: prefilledItems };
      });
      setCurrentLicensePlateIndex(null);
    }
    setShowLicensePlateModal(false);
  }, [currentLicensePlateIndex]);

  const handleEditModalStateChange = useCallback((isOpen) => {
    setIsItemEditModalOpen(isOpen);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center p-1" style={{zIndex: Z_INDEX.MODAL_BACKDROP}}>
      <div className="bg-white rounded-lg w-full max-w-[98vw] max-h-[98vh] flex flex-col" style={{zIndex: Z_INDEX.MODAL}}>
        <ExpenseHeader
          expenseData={invoiceData}
          loading={loading}
          isEditing={isEditing}
          editedData={editedData}
          onClose={handleClose}
          onFieldChange={handleFieldChange}
          title={`Chi tiết phiếu thu`}
          statusOptions={statusOptions}
        />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-2 text-sm">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {/* Status Change Prompts */}
          <StatusChangePrompts
            showPaymentProofPrompt={showPaymentProofPrompt}
            showCancelReasonPrompt={showCancelReasonPrompt}
            tempPaymentProof={tempPaymentProof}
            tempCancelReason={tempCancelReason}
            onPaymentProofChange={setTempPaymentProof}
            onCancelReasonChange={setTempCancelReason}
            onPaymentProofConfirm={handlePaymentProofConfirm}
            onCancelReasonConfirm={handleCancelReasonConfirm}
            onCancel={handlePromptCancel}
          />

          {invoiceData && !loading && (
            <>
              <ExpenseBasicInfo
                expenseData={invoiceData}
                isEditing={isEditing}
                editedData={editedData}
                onFieldChange={handleFieldChange}
                expenseCategories={invoiceCategories}
                isLoadingCategories={isLoadingCategories}
                isInModal={true}
              />

              <ExpenseOptionalSections
                expenseData={invoiceData}
                isEditing={isEditing}
                editedData={editedData}
                onFieldChange={handleFieldChange}
              />

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              <ExpenseItemsTable
                items={isEditing ? editedData.items : invoiceData.items}
                isEditing={isEditing}
                onItemChange={handleItemChange}
                onDeleteItem={handleDeleteItem}
                onLicensePlateCellClick={handleLicensePlateCellClick}
                total={calculatedTotal}
                isInvoiceMode={true}
                onEditModalStateChange={handleEditModalStateChange}
                licensePlates={getAllLicensePlates}
                isLoadingPlates={isLoadingPlates}
              />
            </>
          )}
        </div>

        <ExpenseActionButtons
          isEditing={isEditing}
          isSaving={isSaving}
          expenseData={invoiceData}
          onAddItem={handleAddItem}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onEditClick={handleEditClick}
          onClose={handleClose}
        />
      </div>

      {showLicensePlateModal && (
        <LicensePlateSelectionModal
          open={showLicensePlateModal}
          onClose={() => setShowLicensePlateModal(false)}
          onSelect={handleLicensePlateSelect}
          licensePlates={getAllLicensePlates}
          isLoading={isLoadingPlates}
        />
      )}
    </div>
  );
};

InvoiceViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(InvoiceViewModal);
