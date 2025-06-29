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
    onClose();
  }, [onClose]);

  const handleFieldChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
    // Don't call onChange immediately to prevent re-renders while typing
    // Parent will get the updated data when saving
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

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
      setCurrentLicensePlateIndex(null);
    }
    setShowLicensePlateModal(false);
  }, [currentLicensePlateIndex]);

  // Placeholder functions for components that need them but aren't used in add mode
  const handleEditClick = useCallback(() => {}, []);
  const handleCancelEdit = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleSaveEdit = useCallback(async () => {
    setIsSaving(true);
    setError(null);
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
        items: updatedItems,
        total: totalAmount
      };

      // Update the parent with final data before saving
      onChange({ target: { name: 'formData', value: saveData } });
      await onSave();
      handleClose();
    } catch (err) {
      setError('Không thể lưu phiếu chi');
      console.error('Error saving expense:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, onChange, onSave, handleClose]);

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
