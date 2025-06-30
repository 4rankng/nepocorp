import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';
import { settingsApi } from '@services/api/settingsApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import LicensePlateSelectionModal from '../LicensePlateSelectionModal';
import ExpenseHeader from '../expense/ExpenseHeader';
import ExpenseBasicInfo from '../expense/ExpenseBasicInfo';
import ExpenseOptionalSections from '../expense/ExpenseOptionalSections';
import ExpenseItemsTable from '../expense/ExpenseItemsTable';
import ExpenseActionButtons from '../expense/ExpenseActionButtons';
import ExpenseItemEditModal from '../expense/ExpenseItemEditModal';
import StatusChangePrompts from '../shared/modals/StatusChangePrompts';
import { prepareExpenseItemsForUpdate, calculateExpenseTotal } from '@utils/expenseHelpers';
import { formatCurrency } from '@utils/format';
import { Z_INDEX, setParentZIndex } from '@constants/zIndex';


const ExpenseForm = ({
  open,
  isEdit,
  isLoading,
  formData,
  errors = {},
  onClose,
  onChange,
  onSave,
  licensePlates = [],
  isLoadingPlates = false,
  expenseCategoryId = null,
  title = null,
}) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  // Simulate expense data structure for add mode
  const expenseData = isEdit ? formData : {
    expense_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    vendor_name: '',
    expense_category_id: expenseCategoryId || '',
    payment_status: PAYMENT_STATUS.DRAFT,
    payment_proof: '',
    items: [],
    remark: '',
    total: 0
  };

  // Refs for stable references (prevent infinite re-renders)
  const originalDataRef = useRef(null);
  const modifiedFieldsRef = useRef(new Set());
  const isInitializedRef = useRef(false);
  
  const [editedData, setEditedData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [showItemEditModal, setShowItemEditModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Status change prompts
  const [showPaymentProofPrompt, setShowPaymentProofPrompt] = useState(false);
  const [showCancelReasonPrompt, setShowCancelReasonPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [tempPaymentProof, setTempPaymentProof] = useState('');
  const [tempCancelReason, setTempCancelReason] = useState('');
  const [previousStatus, setPreviousStatus] = useState(null);

  // Memoize calculated total to prevent unnecessary recalculations
  const calculatedTotal = useMemo(() => {
    return editedData?.items ? calculateExpenseTotal(editedData.items) : 0;
  }, [editedData?.items]);

  // Always in editing mode for add form
  const isEditing = true;

  // Initialize editedData based on mode - prevent infinite re-renders
  useEffect(() => {
    if (open && !isInitializedRef.current) {
      const initialData = isEdit && formData ? {
        ...formData,
        items: formData.items && formData.items.length > 0 
          ? formData.items.map(item => ({ ...item }))
          : []
      } : {
        expense_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        vendor_name: '',
        expense_category_id: expenseCategoryId || '',
        payment_status: PAYMENT_STATUS.DRAFT,
        payment_proof: '',
        items: [],
        remark: ''
      };
      
      // Store original data snapshot for change tracking
      originalDataRef.current = JSON.parse(JSON.stringify(initialData));
      modifiedFieldsRef.current.clear();
      setEditedData(initialData);
      setHasChanges(false);
      isInitializedRef.current = true;
    }
  }, [open, isEdit]);
  
  // Handle formData updates separately (for edit mode)
  useEffect(() => {
    if (open && isEdit && formData && isInitializedRef.current) {
      const newData = {
        ...formData,
        items: formData.items && formData.items.length > 0 
          ? formData.items.map(item => ({ ...item }))
          : []
      };
      
      // Update original data ref and reset tracking
      originalDataRef.current = JSON.parse(JSON.stringify(newData));
      modifiedFieldsRef.current.clear();
      setEditedData(newData);
      setHasChanges(false);
    }
  }, [open, isEdit, formData?.id]); // Use formData.id to detect actual data changes

  // Load settings when modal opens - separate effect to prevent re-renders
  useEffect(() => {
    if (!open) return;
    
    const loadSettings = async () => {
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
      } catch (error) {
        console.error('Failed to load tax rate:', error);
      }
    };

    loadSettings();
  }, [open]);
  
  // Load expense categories - separate effect with stable dependency
  useEffect(() => {
    if (!open || expenseCategoryId) return;
    
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await expenseCategoryApi.getAllWithoutPagination();
        const categories = response?.data || response || [];
        setExpenseCategories(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.warn('Failed to load categories:', error);
        setExpenseCategories([]);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    loadCategories();
  }, [open, !!expenseCategoryId]); // Use boolean to stabilize dependency

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

  // Handle ESC key
  useEffect(() => {
    const handleEscKey = (event) => {
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
    // Reset all refs to prevent stale data
    originalDataRef.current = null;
    modifiedFieldsRef.current.clear();
    isInitializedRef.current = false;
    
    setEditedData(null);
    setError(null);
    setValidationErrors({});
    setHasChanges(false);
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
    onClose();
  }, [onClose]);

  const handleFieldChange = useCallback((field, value) => {
    console.log('🔵 handleFieldChange called:', { field, value, currentStatus: editedData?.payment_status });
    
    // Handle status changes that require prompts
    if (field === 'payment_status') {
      const oldStatus = editedData?.payment_status;
      console.log('🟡 Status change detected:', { oldStatus, newValue: value });

      // First, close any existing prompts if changing to a different status
      if (showPaymentProofPrompt || showCancelReasonPrompt) {
        console.log('🟠 Closing existing prompts');
        setShowPaymentProofPrompt(false);
        setShowCancelReasonPrompt(false);
        setPendingStatus(null);
        setTempPaymentProof('');
        setTempCancelReason('');
        setPreviousStatus(null);
      }

      if (value === PAYMENT_STATUS.PAID && oldStatus !== PAYMENT_STATUS.PAID) {
        console.log('🟢 Setting up PAID prompt');
        setPreviousStatus(oldStatus); // Store the current status before changing
        setPendingStatus(value);
        setTempPaymentProof(editedData?.payment_proof || '');
        setShowPaymentProofPrompt(true);
        // Update the status immediately for visual feedback
        setEditedData(prev => {
          console.log('🟢 Updating editedData for PAID:', { prev: prev.payment_status, new: value });
          return {
            ...prev,
            payment_status: value
          };
        });
        modifiedFieldsRef.current.add('payment_status');
        setHasChanges(true);
        return;
      }

      if (value === PAYMENT_STATUS.CANCELLED && oldStatus !== PAYMENT_STATUS.CANCELLED) {
        console.log('🔴 Setting up CANCELLED prompt');
        setPreviousStatus(oldStatus); // Store the current status before changing
        setPendingStatus(value);
        setTempCancelReason(editedData?.cancel_reason || '');
        setShowCancelReasonPrompt(true);
        // Update the status immediately for visual feedback
        setEditedData(prev => {
          console.log('🔴 Updating editedData for CANCELLED:', { prev: prev.payment_status, new: value });
          return {
            ...prev,
            payment_status: value
          };
        });
        modifiedFieldsRef.current.add('payment_status');
        setHasChanges(true);
        return;
      }
    }
    
    console.log('⚪ Normal field update:', { field, value });
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Track field modification using ref (no re-render)
    modifiedFieldsRef.current.add(field);
    setHasChanges(true);
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [validationErrors, editedData?.payment_status, editedData?.payment_proof, editedData?.cancel_reason, showPaymentProofPrompt, showCancelReasonPrompt]);

  const handleItemChange = useCallback((index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
    
    // Track item modification using ref (no re-render)
    modifiedFieldsRef.current.add('items');
    modifiedFieldsRef.current.add(`items.${index}.${field}`);
    setHasChanges(true);
    
    // Clear validation error for this item field when user starts typing
    const errorKey = `items.${index}.${field}`;
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[errorKey];
        return newErrors;
      });
    }
    
    // Also clear general items error if user is actively editing
    if (validationErrors.items && (field === 'item_name' || field === 'price' || field === 'quantity' || field === 'license_plate')) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.items;
        return newErrors;
      });
    }
  }, [validationErrors]);

  const handleAddItem = useCallback(() => {
    setEditingItemIndex(null);
    setShowItemEditModal(true);
  }, []);

  const handleDeleteItem = useCallback((index) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    
    // Track items modification
    modifiedFieldsRef.current.add('items');
    setHasChanges(true);
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
      
      // Track items modification
      modifiedFieldsRef.current.add('items');
      setHasChanges(true);
      
      // Clear validation errors for license plates when user selects
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        // Clear license plate errors for all items since we prefill
        Object.keys(newErrors).forEach(key => {
          if (key.includes('.license_plate')) {
            delete newErrors[key];
          }
        });
        // Also clear general items error
        delete newErrors.items;
        return newErrors;
      });
      
      setCurrentLicensePlateIndex(null);
    }
    setShowLicensePlateModal(false);
  }, [currentLicensePlateIndex]);

  // Handle item edit modal
  const handleItemEditModalClose = useCallback(() => {
    setShowItemEditModal(false);
    setEditingItemIndex(null);
  }, []);

  // Handle payment proof confirmation
  const handlePaymentProofConfirm = useCallback(() => {
    console.log('✅ Payment proof confirm clicked');
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

    // Track field modifications
    modifiedFieldsRef.current.add('payment_status');
    modifiedFieldsRef.current.add('payment_proof');
    modifiedFieldsRef.current.add('cancel_reason');
    setHasChanges(true);

    setShowPaymentProofPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setPreviousStatus(null);
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

    // Track field modifications
    modifiedFieldsRef.current.add('payment_status');
    modifiedFieldsRef.current.add('cancel_reason');
    modifiedFieldsRef.current.add('payment_proof');
    setHasChanges(true);

    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempCancelReason('');
    setPreviousStatus(null);
  }, [tempCancelReason, pendingStatus]);

  // Handle prompt cancellation
  const handlePromptCancel = useCallback(() => {
    console.log('❌ Prompt cancelled, reverting to:', previousStatus);
    // Revert to previous status if cancelling
    if (previousStatus !== null) {
      setEditedData(prev => ({
        ...prev,
        payment_status: previousStatus
      }));
    }
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
    setPreviousStatus(null);
  }, [previousStatus]);

  const handleItemSave = useCallback((itemData) => {
    if (editingItemIndex !== null) {
      // Edit existing item
      setEditedData(prev => ({
        ...prev,
        items: prev.items.map((item, index) =>
          index === editingItemIndex ? itemData : item
        )
      }));
    } else {
      // Add new item
      setEditedData(prev => ({
        ...prev,
        items: [...prev.items, itemData]
      }));
    }
    
    // Track items modification
    modifiedFieldsRef.current.add('items');
    setHasChanges(true);
    
    setShowItemEditModal(false);
    setEditingItemIndex(null);
  }, [editingItemIndex]);

  // Prepare only modified data for API request
  const prepareModifiedData = useCallback(() => {
    if (!originalDataRef.current || !editedData) return editedData;
    
    const modifiedData = {};
    const modifiedFields = modifiedFieldsRef.current;
    
    // Check each field for modifications
    Object.keys(editedData).forEach(field => {
      if (field === 'items') {
        // Handle items specially - always send if modified
        if (modifiedFields.has('items')) {
          const updatedItems = prepareExpenseItemsForUpdate(editedData.items);
          const totalAmount = calculateExpenseTotal(updatedItems);
          modifiedData.items = updatedItems;
          modifiedData.total = totalAmount;
        }
      } else if (modifiedFields.has(field)) {
        // Include other modified fields
        const currentValue = editedData[field];
        const originalValue = originalDataRef.current[field];
        
        // Only include if actually different from original
        if (currentValue !== originalValue) {
          modifiedData[field] = currentValue;
        }
      }
    });
    
    // Always include currency if we have items (backend expects it)
    if (modifiedData.items) {
      modifiedData.currency = 'VND';
    }
    
    console.log('💰 Modified fields being sent:', Object.keys(modifiedData));
    console.log('💰 Full modified data:', JSON.stringify(modifiedData, null, 2));
    
    return modifiedData;
  }, [editedData]);

  // Placeholder functions for components that need them but aren't used in add mode
  const handleEditClick = useCallback(() => {}, []);
  const handleCancelEdit = useCallback(() => {
    handleClose();
  }, [handleClose]);

  // Validation function matching useExpenseForm structure
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    // Validate main fields
    if (!editedData?.vendor_name?.trim()) {
      newErrors.vendor_name = 'Vui lòng nhập tên nhà cung cấp';
    }
    
    if (!expenseCategoryId && !editedData?.expense_category_id) {
      newErrors.expense_category_id = 'Vui lòng chọn loại chi phí';
    }
    
    // Validate items
    if (!editedData?.items || editedData.items.length === 0) {
      newErrors.items = 'Vui lòng thêm ít nhất một hạng mục';
    } else {
      let hasValidItem = false;
      editedData.items.forEach((item, index) => {
        // Validate license plate for each item (critical for backend)
        if (!item.license_plate) {
          newErrors[`items.${index}.license_plate`] = 'Vui lòng chọn biển số xe';
        }
        
        if (!item.item_name?.trim()) {
          newErrors[`items.${index}.item_name`] = 'Vui lòng nhập tên hạng mục';
        } else {
          hasValidItem = true;
        }
        
        if (!item.price || parseFloat(item.price) <= 0) {
          newErrors[`items.${index}.price`] = 'Đơn giá không hợp lệ';
        }
        if (!item.quantity || parseInt(item.quantity) <= 0) {
          newErrors[`items.${index}.quantity`] = 'Số lượng phải lớn hơn 0';
        }
      });
      
      if (!hasValidItem) {
        newErrors.items = 'Vui lòng điền thông tin cho ít nhất một hạng mục';
      }
    }
    
    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [editedData, expenseCategoryId]);

  const handleSaveEdit = useCallback(async () => {
    // Clear previous errors
    setError(null);
    setValidationErrors({});
    
    // Validate form before attempting to save
    const isValid = validateForm();
    if (!isValid) {
      // Scroll to first error or show general validation message
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return; // Don't proceed with save or close modal
    }
    
    setIsSaving(true);
    try {
      // Use selective data preparation - only send modified fields
      const saveData = prepareModifiedData();
      
      // Fallback to full data if no modifications detected (shouldn't happen)
      if (Object.keys(saveData).length === 0) {
        console.warn('No modifications detected, sending full data as fallback');
        const updatedItems = prepareExpenseItemsForUpdate(editedData.items);
        const totalAmount = calculateExpenseTotal(updatedItems);
        saveData.vendor_name = editedData.vendor_name;
        saveData.expense_category_id = editedData.expense_category_id;
        saveData.payment_status = editedData.payment_status;
        saveData.payment_proof = editedData.payment_proof || null;
        saveData.cancel_reason = editedData.cancel_reason || null;
        saveData.remark = editedData.remark;
        saveData.currency = 'VND';
        saveData.items = updatedItems;
        saveData.total = totalAmount;
      }

      // Update the parent with final data before saving
      onChange({ target: { name: 'formData', value: saveData } });
      await onSave(null, 0, 10, saveData); // Pass the prepared data directly
      
      // Only close modal if save was successful
      handleClose();
    } catch (err) {
      // Handle different types of errors
      let errorMessage = 'Không thể lưu phiếu chi';
      
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.errors?.message) {
        errorMessage = err.response.data.errors.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Handle validation errors from backend
      if (err?.response?.data?.errors && typeof err.response.data.errors === 'object') {
        setValidationErrors(err.response.data.errors);
      }
      
      setError(errorMessage);
      console.error('Error saving expense:', err);
      
      // Don't close modal on error - let user see the error and try again
    } finally {
      setIsSaving(false);
    }
  }, [editedData, onChange, onSave, handleClose, validateForm, prepareModifiedData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveEdit();
  };

  if (!open || !editedData) return null;

  console.log('🎨 Rendering ExpenseForm with status:', editedData.payment_status);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center p-1" style={{zIndex: Z_INDEX.MODAL_BACKDROP}}>
        <div 
          className="bg-white rounded-lg w-full max-w-[98vw] max-h-[98vh] flex flex-col" 
          style={{
            zIndex: Z_INDEX.MODAL,
            '--parent-z-index': Z_INDEX.MODAL
          }}
          ref={(el) => {
            if (el) {
              setParentZIndex(el, Z_INDEX.MODAL);
            }
          }}
        >
          <ExpenseHeader
            expenseData={expenseData}
            loading={false}
            isEditing={isEditing}
            editedData={editedData}
            onClose={handleClose}
            onFieldChange={handleFieldChange}
            title={title || (isEdit ? 'Sửa phiếu chi' : 'Thêm phiếu chi mới')}
          />

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-2">
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

            <ExpenseBasicInfo
              expenseData={expenseData}
              isEditing={isEditing}
              editedData={editedData}
              onFieldChange={handleFieldChange}
              expenseCategories={expenseCategories}
              isLoadingCategories={isLoadingCategories}
              isInModal={true}
              errors={validationErrors}
            />

            <ExpenseOptionalSections
              expenseData={expenseData}
              isEditing={isEditing}
              editedData={editedData}
              onFieldChange={handleFieldChange}
            />

            {/* Divider */}
            <div className="border-t border-gray-200 my-4"></div>

            <ExpenseItemsTable
              items={editedData.items}
              isEditing={isEditing}
              onItemChange={handleItemChange}
              onDeleteItem={handleDeleteItem}
              onLicensePlateCellClick={handleLicensePlateCellClick}
              total={calculatedTotal}
              errors={validationErrors}
              licensePlates={getAllLicensePlates}
              isLoadingPlates={isLoadingPlates}
              taxRate={taxRate}
            />
          </div>

          <ExpenseActionButtons
            isEditing={isEditing}
            isSaving={isSaving}
            expenseData={expenseData}
            onAddItem={handleAddItem}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
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
        <ExpenseItemEditModal
          isOpen={showItemEditModal}
          onClose={handleItemEditModalClose}
          onSave={handleItemSave}
          item={editingItemIndex !== null ? editedData.items[editingItemIndex] : null}
          isEdit={editingItemIndex !== null}
          licensePlates={getAllLicensePlates}
          isLoadingPlates={isLoadingPlates}
          taxRate={taxRate}
        />
      )}
    </>
  );
};

export default React.memo(ExpenseForm);
