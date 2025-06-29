import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
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
import { prepareExpenseItemsForUpdate, calculateExpenseTotal } from '@utils/expenseHelpers';
import { formatCurrency } from '@utils/format';
import { Z_INDEX } from '@constants/zIndex';


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

  const [editedData, setEditedData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Memoize calculated total to prevent unnecessary recalculations
  const calculatedTotal = useMemo(() => {
    return editedData?.items ? calculateExpenseTotal(editedData.items) : 0;
  }, [editedData?.items]);

  // Always in editing mode for add form
  const isEditing = true;

  // Initialize editedData based on mode
  useEffect(() => {
    if (open) {
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
        items: [{
          license_plate: '',
          item_name: '',
          install_date: null,
          expiry_date: null,
          price: 0,
          quantity: 1,
          tax_rate: taxRate,
          total: 0
        }],
        remark: ''
      };
      setEditedData(initialData);
    }
  }, [open, isEdit, formData, expenseCategoryId, taxRate]);

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

        // Load expense categories if not fixed
        if (!expenseCategoryId) {
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
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [open, expenseCategoryId]);

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
      if (event.key === 'Escape' && open && !showLicensePlateModal) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, onClose, showLicensePlateModal]);

  const handleClose = useCallback(() => {
    setEditedData(null);
    setError(null);
    setValidationErrors({});
    onClose();
  }, [onClose]);

  const handleFieldChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Don't call onChange immediately to prevent re-renders while typing
    // Parent will get the updated data when saving
  }, [validationErrors]);

  const handleItemChange = useCallback((index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
    
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
    setEditedData(prev => ({
      ...prev,
      items: [...prev.items, {
        license_plate: '',
        item_name: '',
        install_date: null,
        expiry_date: null,
        price: 0,
        quantity: 1,
        tax_rate: taxRate,
        total: 0
      }]
    }));
  }, [taxRate]);

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
      const updatedItems = prepareExpenseItemsForUpdate(editedData.items);
      const totalAmount = calculateExpenseTotal(updatedItems);

      const saveData = {
        vendor_name: editedData.vendor_name,
        expense_category_id: editedData.expense_category_id,
        payment_status: editedData.payment_status,
        payment_proof: editedData.payment_proof || null,
        cancel_reason: editedData.cancel_reason || null,
        remark: editedData.remark,
        currency: 'VND',
        items: updatedItems,
        total: totalAmount
      };

      // Debug: Log the payload being sent to API
      console.log('💰 Expense payload being sent to API:', JSON.stringify(saveData, null, 2));

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
  }, [editedData, onChange, onSave, handleClose, validateForm]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveEdit();
  };

  if (!open || !editedData) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center p-1" style={{zIndex: Z_INDEX.MODAL_BACKDROP}}>
        <div className="bg-white rounded-lg w-full max-w-[98vw] h-[98vh]" style={{zIndex: Z_INDEX.MODAL, overflow: 'visible'}}>
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
          <div className="relative" style={{overflow: 'visible'}}>
            <div className="p-2 overflow-y-auto h-[85vh]" style={{borderRadius: '0 0 0.5rem 0.5rem'}}>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
                  {error}
                </div>
              )}

              <ExpenseBasicInfo
                expenseData={expenseData}
                isEditing={isEditing}
                editedData={editedData}
                onFieldChange={handleFieldChange}
                expenseCategories={expenseCategories}
                isLoadingCategories={isLoadingCategories}
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
              />
            </div>
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
    </>
  );
};

export default React.memo(ExpenseForm);
