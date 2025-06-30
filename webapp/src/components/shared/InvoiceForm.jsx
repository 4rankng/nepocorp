import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { INVOICE_STATUS, INVOICE_STATUS_LABELS } from '@constants/invoice';
import { settingsApi } from '@services/api/settingsApi';
import { invoiceCategoryApi } from '@services/api/invoiceCategoryApi';
import { customerApi } from '@services/api/customerApi';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import LicensePlateSelectionModal from '../LicensePlateSelectionModal';
import ExpenseHeader from '../expense/ExpenseHeader';
import ExpenseBasicInfo from '../expense/ExpenseBasicInfo';
import ExpenseOptionalSections from '../expense/ExpenseOptionalSections';
import ExpenseItemsTable from '../expense/ExpenseItemsTable';
import ExpenseActionButtons from '../expense/ExpenseActionButtons';
import InvoiceItemEditModal from '../invoice/InvoiceItemEditModal';
import PaymentProofModal from '../shared/modals/PaymentProofModal';
import CancelReasonModal from '../shared/modals/CancelReasonModal';
import logger from '@services/logger';
import { prepareInvoiceItemsForUpdate, calculateInvoiceTotal } from '@utils/invoiceHelpers';
import { getPaymentStatusColor } from '@utils/expenseHelpers';
import { Z_INDEX, setParentZIndex } from '@constants/zIndex';
import useInvoiceEdit from '../hooks/useInvoiceEdit';

const InvoiceForm = ({
  open,
  isEdit,
  formData,
  onClose,
  onChange,
  onSave,
  isLoadingPlates = false,
  title = null,
}) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);

  // Simulate invoice data structure for add mode
  const invoiceData = isEdit
    ? formData
    : {
        customer_id: '',
        invoice_category_id: '',
        payment_status: INVOICE_STATUS.DRAFT,
        payment_proof: '',
        items: [],
        remark: '',
        total: 0,
      };

  // Use the hook for state management
  const {
    isEditing,
    editedData,
    isSaving,
    saveError,
    showItemEditModal,
    editingItemIndex,
    handleAddItem,
    handleDeleteItem,
    handleItemEditModalClose,
    handleItemSave,
    handleFieldChange,
    handleItemChange,
    handleEditClick,
    handleCancelEdit,
    handleSaveEdit,
    setShowItemEditModal,
    setEditingItemIndex,
  } = useInvoiceEdit(invoiceData, null, () => {}, fetchTractors, fetchTrailers, true);

  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);
  const [error, setError] = useState(null);

  // Status change prompts
  const [showPaymentProofPrompt, setShowPaymentProofPrompt] = useState(false);
  const [showCancelReasonPrompt, setShowCancelReasonPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [tempPaymentProof, setTempPaymentProof] = useState('');
  const [tempCancelReason, setTempCancelReason] = useState('');
  const [previousStatus, setPreviousStatus] = useState(null);

  // Load settings when modal opens
  useEffect(() => {
    const loadSettings = async () => {
      if (!open) return;

      try {
        // Load tax rate
        const cachedTaxRate = localStorage.getItem('taxRate');
        if (cachedTaxRate) {
          setTaxRate(parseFloat(cachedTaxRate));
        } else {
          try {
            const response = await settingsApi.getTaxRate();
            const rate = parseFloat(response.value);
            setTaxRate(rate);
            localStorage.setItem('taxRate', rate.toString());
          } catch (error) {
            console.warn('Failed to load tax rate:', error);
            setTaxRate(10);
          }
        }

        // Load invoice categories
        setIsLoadingCategories(true);
        try {
          const categoriesResponse = await invoiceCategoryApi.getAllWithoutPagination();
          const categories = categoriesResponse?.data || categoriesResponse || [];
          setInvoiceCategories(Array.isArray(categories) ? categories : []);
        } catch (error) {
          console.warn('Failed to load categories:', error);
          setInvoiceCategories([]);
        } finally {
          setIsLoadingCategories(false);
        }

        // Load customers
        setIsLoadingCustomers(true);
        try {
          const customersResponse = await customerApi.getAll();
          const customers = customersResponse?.data || customersResponse || [];
          setCustomers(Array.isArray(customers) ? customers : []);
        } catch (error) {
          console.warn('Failed to load customers:', error);
          setCustomers([]);
        } finally {
          setIsLoadingCustomers(false);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [open]);

  // Get license plates for dropdown - memoized to prevent re-creation
  const getAllLicensePlates = useMemo(() => {
    const tractorPlates = tractors.map(t => ({
      value: t.license_plate,
      label: t.license_plate,
      type: 'tractor',
    }));

    const trailerPlates = trailers.map(t => ({
      value: t.license_plate,
      label: t.license_plate,
      type: 'trailer',
    }));

    return [...tractorPlates, ...trailerPlates];
  }, [tractors, trailers]);

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = event => {
      if (event.key === 'Escape' && open && !showLicensePlateModal && !showItemEditModal) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, onClose, showLicensePlateModal, showItemEditModal]);

  const handleClose = useCallback(() => {
    setError(null);
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
    onClose();
  }, [onClose]);

  // Override handleFieldChange to also call parent onChange
  const wrappedHandleFieldChange = useCallback(
    (field, value) => {
      // Handle status changes that require prompts
      if (field === 'payment_status') {
        const oldStatus = editedData?.payment_status;

        // First, close any existing prompts if changing to a different status
        if (showPaymentProofPrompt || showCancelReasonPrompt) {
          setShowPaymentProofPrompt(false);
          setShowCancelReasonPrompt(false);
          setPendingStatus(null);
          setTempPaymentProof('');
          setTempCancelReason('');
          setPreviousStatus(null);
        }

        if (value === INVOICE_STATUS.PAID && oldStatus !== INVOICE_STATUS.PAID) {
          logger.info('Status change to PAID initiated', {
            oldStatus,
            newStatus: value,
            formType: 'invoice',
          });
          setPreviousStatus(oldStatus); // Store the current status before changing
          setPendingStatus(value);
          setTempPaymentProof(editedData?.payment_proof || '');
          setShowPaymentProofPrompt(true);
          // Update the status immediately for visual feedback
          handleFieldChange('payment_status', value);
          return;
        }

        if (value === INVOICE_STATUS.CANCELLED && oldStatus !== INVOICE_STATUS.CANCELLED) {
          logger.info('Status change to CANCELLED initiated', {
            oldStatus,
            newStatus: value,
            formType: 'invoice',
          });
          setPreviousStatus(oldStatus); // Store the current status before changing
          setPendingStatus(value);
          setTempCancelReason(editedData?.cancel_reason || '');
          setShowCancelReasonPrompt(true);
          // Update the status immediately for visual feedback
          handleFieldChange('payment_status', value);
          return;
        }
      }

      handleFieldChange(field, value);
    },
    [
      handleFieldChange,
      editedData?.payment_status,
      editedData?.payment_proof,
      editedData?.cancel_reason,
      showPaymentProofPrompt,
      showCancelReasonPrompt,
    ]
  );

  const handleLicensePlateCellClick = useCallback(index => {
    setCurrentLicensePlateIndex(index);
    setShowLicensePlateModal(true);
  }, []);

  const handleLicensePlateSelect = useCallback(
    selectedPlate => {
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
    },
    [currentLicensePlateIndex]
  );

  // Override handleCancelEdit to also close the modal
  const wrappedHandleCancelEdit = useCallback(() => {
    handleCancelEdit();
    handleClose();
  }, [handleCancelEdit, handleClose]);

  // Override handleSaveEdit to work with parent form
  const wrappedHandleSaveEdit = useCallback(async () => {
    if (!editedData) return;

    try {
      const updatedItems = prepareInvoiceItemsForUpdate(editedData.items);
      const totalAmount = calculateInvoiceTotal(updatedItems);

      const saveData = {
        customer_id: editedData.customer_id,
        invoice_category_id: editedData.invoice_category_id,
        payment_status: editedData.payment_status,
        payment_proof: editedData.payment_proof || null,
        cancel_reason: editedData.cancel_reason || null,
        remark: editedData.remark,
        items: updatedItems,
        total: totalAmount,
      };

      // Update the onChange to reflect final data
      onChange({ target: { name: 'formData', value: saveData } });
      await onSave();
      handleClose();
    } catch (err) {
      setError('Không thể lưu phiếu thu');
      console.error('Error saving invoice:', err);
    }
  }, [editedData, onChange, onSave, handleClose]);

  const wrappedHandleAddItem = useCallback(() => {
    handleAddItem();
  }, [handleAddItem]);

  // Handle payment proof confirmation
  const handlePaymentProofConfirm = useCallback(
    paymentProof => {
      logger.info('Payment proof confirmed for invoice', {
        paymentProof,
        newStatus: INVOICE_STATUS.PAID,
        formType: 'invoice',
      });

      handleFieldChange('payment_status', INVOICE_STATUS.PAID);
      handleFieldChange('payment_proof', paymentProof);
      handleFieldChange('cancel_reason', null); // Clear cancel reason when marking as paid

      setShowPaymentProofPrompt(false);
      setPendingStatus(null);
      setTempPaymentProof('');
      setPreviousStatus(null);
    },
    [handleFieldChange]
  );

  // Handle cancel reason confirmation
  const handleCancelReasonConfirm = useCallback(
    cancelReason => {
      logger.info('Cancel reason confirmed for invoice', {
        cancelReason,
        newStatus: INVOICE_STATUS.CANCELLED,
        formType: 'invoice',
      });

      handleFieldChange('payment_status', INVOICE_STATUS.CANCELLED);
      handleFieldChange('cancel_reason', cancelReason);
      handleFieldChange('payment_proof', null); // Clear payment proof when cancelling

      setShowCancelReasonPrompt(false);
      setPendingStatus(null);
      setTempCancelReason('');
      setPreviousStatus(null);
    },
    [handleFieldChange]
  );

  // Handle prompt cancellation
  const handlePromptCancel = useCallback(() => {
    logger.info('Status change cancelled', {
      revertingTo: previousStatus,
      formType: 'invoice',
    });
    // Revert to previous status if cancelling
    if (previousStatus !== null) {
      handleFieldChange('payment_status', previousStatus);
    }
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
    setPreviousStatus(null);
  }, [previousStatus, handleFieldChange, onChange]);

  if (!open || !editedData) return null;

  // Adapt invoice categories for ExpenseBasicInfo component
  const adaptedInvoiceCategories = invoiceCategories.map(category => ({
    id: category.id,
    name: category.name,
  }));

  // Adapt customers data for use in ExpenseBasicInfo
  const adaptedCustomers = customers.map(customer => ({
    id: customer.id,
    name: `${customer.name} (${customer.tax_code})`,
  }));

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex justify-center p-1"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
      >
        <div
          className="bg-white rounded-lg w-full max-w-[98vw] max-h-[98vh] flex flex-col"
          style={{
            zIndex: Z_INDEX.MODAL,
            '--parent-z-index': Z_INDEX.MODAL,
          }}
          ref={el => {
            if (el) {
              setParentZIndex(el, Z_INDEX.MODAL);
            }
          }}
        >
          <ExpenseHeader
            expenseData={invoiceData}
            loading={false}
            isEditing={isEditing}
            editedData={editedData}
            onClose={handleClose}
            onFieldChange={wrappedHandleFieldChange}
            title={title || (isEdit ? 'Sửa phiếu thu' : 'Thêm phiếu thu mới')}
            statusOptions={Object.entries(INVOICE_STATUS).map(([, value]) => ({
              value: value,
              label: INVOICE_STATUS_LABELS[value],
              color: getPaymentStatusColor(value),
            }))}
          />

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-2">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
                {error}
              </div>
            )}

            {/* Status change modals are rendered outside the main form */}

            <ExpenseBasicInfo
              expenseData={invoiceData}
              isEditing={isEditing}
              editedData={editedData}
              onFieldChange={wrappedHandleFieldChange}
              expenseCategories={adaptedInvoiceCategories}
              isLoadingCategories={isLoadingCategories}
              isInModal={true}
              isInvoiceMode={true}
              customers={adaptedCustomers}
              isLoadingCustomers={isLoadingCustomers}
            />

            <ExpenseOptionalSections
              expenseData={invoiceData}
              isEditing={isEditing}
              editedData={editedData}
              onFieldChange={wrappedHandleFieldChange}
              isInvoiceMode={true}
            />

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            <ExpenseItemsTable
              items={editedData.items}
              isEditing={isEditing}
              onItemChange={handleItemChange}
              onDeleteItem={handleDeleteItem}
              onLicensePlateCellClick={handleLicensePlateCellClick}
              total={calculateInvoiceTotal(editedData.items)}
              isInvoiceMode={true}
              licensePlates={getAllLicensePlates}
              isLoadingPlates={isLoadingPlates}
              taxRate={taxRate}
            />
          </div>

          <ExpenseActionButtons
            isEditing={isEditing}
            isSaving={isSaving}
            expenseData={invoiceData}
            onAddItem={wrappedHandleAddItem}
            onCancelEdit={wrappedHandleCancelEdit}
            onSaveEdit={wrappedHandleSaveEdit}
            onEditClick={handleEditClick}
            onClose={handleClose}
          />
        </div>
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

      {showItemEditModal && (
        <div style={{ zIndex: Z_INDEX.NESTED_MODAL }}>
          <InvoiceItemEditModal
            isOpen={showItemEditModal}
            onClose={handleItemEditModalClose}
            onSave={handleItemSave}
            item={editingItemIndex !== null ? editedData.items[editingItemIndex] : null}
            isEdit={editingItemIndex !== null}
            licensePlates={getAllLicensePlates}
            isLoadingPlates={isLoadingPlates}
            taxRate={taxRate}
          />
        </div>
      )}

      {/* Payment Proof Modal */}
      <PaymentProofModal
        open={showPaymentProofPrompt}
        onClose={handlePromptCancel}
        onConfirm={handlePaymentProofConfirm}
        initialValue={tempPaymentProof}
      />

      {/* Cancel Reason Modal */}
      <CancelReasonModal
        open={showCancelReasonPrompt}
        onClose={handlePromptCancel}
        onConfirm={handleCancelReasonConfirm}
        initialValue={tempCancelReason}
        entityType="phiếu thu"
      />
    </>
  );
};

export default InvoiceForm;
