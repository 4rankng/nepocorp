import { useState, useCallback, useEffect } from 'react';
import { expenseApi } from '@services/api/expenseApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import { settingsApi } from '@services/api/settingsApi';

const useExpenseEdit = (expenseData, expenseId, onDataRefresh, fetchTractors, fetchTrailers) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [taxRate, setTaxRate] = useState(10);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);

  // Fetch expense categories when entering edit mode
  useEffect(() => {
    const fetchCategories = async () => {
      if (isEditing && expenseCategories.length === 0) {
        setIsLoadingCategories(true);
        try {
          const response = await expenseCategoryApi.getAll();
          const categories = response.data?.data || response.data || [];
          setExpenseCategories(categories);
        } catch (err) {
          console.error('Error fetching expense categories:', err);
        } finally {
          setIsLoadingCategories(false);
        }
      }
    };
    fetchCategories();
  }, [isEditing, expenseCategories.length]);

  // Load tax rate when entering edit mode
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!isEditing) return;

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
    };

    loadTaxRate();
  }, [isEditing]);

  // Fetch vehicles when entering edit mode
  useEffect(() => {
    const fetchVehicles = async () => {
      if (!isEditing || !fetchTractors || !fetchTrailers) return;
      
      setIsLoadingPlates(true);
      try {
        await Promise.all([
          fetchTractors(),
          fetchTrailers()
        ]);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
      } finally {
        setIsLoadingPlates(false);
      }
    };

    fetchVehicles();
  }, [isEditing, fetchTractors, fetchTrailers]);

  const handleEditClick = useCallback(() => {
    if (!expenseData) return;
    
    setIsEditing(true);
    setEditedData({
      ...expenseData,
      items: expenseData.items.map(item => ({ ...item }))
    });
  }, [expenseData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
    setSaveError(null);
  }, []);

  const handleFieldChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
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
    setEditingItemIndex(null);
    setShowItemEditModal(true);
  }, []);

  const handleDeleteItem = useCallback((index) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editedData) return;
    
    console.log('useExpenseEdit handleSaveEdit called');
    setIsSaving(true);
    setSaveError(null);
    
    try {
      console.log('Starting validation in useExpenseEdit...');
      
      // Client-side validation
      if (!editedData.vendor_name?.trim()) {
        console.log('Validation failed: vendor_name missing');
        setSaveError('Vui lòng nhập tên nhà cung cấp');
        return;
      }
      
      if (!editedData.expense_category_id) {
        console.log('Validation failed: expense_category_id missing');
        setSaveError('Vui lòng chọn loại chi phí');
        return;
      }

      // Check if items have required license plates
      const itemsWithoutLicensePlate = editedData.items.filter(item => !item.license_plate?.trim());
      if (itemsWithoutLicensePlate.length > 0) {
        console.log('Validation failed: license plates missing');
        setSaveError('Vui lòng chọn biển số xe cho tất cả hạng mục');
        return;
      }

      // Check if items have required names
      const itemsWithoutName = editedData.items.filter(item => !item.item_name?.trim());
      if (itemsWithoutName.length > 0) {
        console.log('Validation failed: item names missing');
        setSaveError('Vui lòng nhập tên cho tất cả hạng mục');
        return;
      }

      console.log('Validation passed in useExpenseEdit, preparing data...');
      
      // Calculate totals for items
      const updatedItems = editedData.items.map(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const taxRate = parseFloat(item.tax_rate) || 0;
        const subtotal = price * quantity;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;
        
        return {
          ...item,
          price,
          quantity,
          tax_rate: taxRate,
          total
        };
      });

      const totalAmount = updatedItems.reduce((sum, item) => sum + item.total, 0);

      const updateData = {
        vendor_name: editedData.vendor_name,
        expense_category_id: editedData.expense_category_id,
        payment_status: editedData.payment_status,
        payment_proof: editedData.payment_proof || null,
        cancel_reason: editedData.cancel_reason || null,
        remark: editedData.remark,
        items: updatedItems,
        total: totalAmount
      };

      console.log('Calling API update with data:', updateData);
      
      const apiResponse = await expenseApi.update(expenseId, updateData);
      console.log('API update successful:', apiResponse);
      
      // Only close editing mode if successful
      console.log('Refreshing data...');
      await onDataRefresh();
      
      console.log('Success! Closing edit mode...');
      setIsEditing(false);
      setEditedData(null);
      
    } catch (err) {
      console.error('Caught error in useExpenseEdit handleSaveEdit:', err);
      
      // Extract error message from API response with comprehensive error handling
      let errorMessage = 'Không thể cập nhật phiếu chi';
      
      // Handle different error response formats
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error?.message) {
        errorMessage = err.response.data.error.message;
      } else if (err.response?.message) {
        errorMessage = err.response.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Handle validation errors specifically
      if (err.response?.data?.errors) {
        const validationErrors = err.response.data.errors;
        if (typeof validationErrors === 'object') {
          const errorMessages = Object.values(validationErrors).flat();
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join(', ');
          }
        }
      }
      
      console.log('Setting error message in useExpenseEdit:', errorMessage);
      setSaveError(errorMessage);
      console.error('Error updating expense:', err);
      console.error('Error response:', err.response);
      
      // IMPORTANT: Don't close editing mode on error
      // The error will be displayed to the user and they can fix the issues
      return; // Explicitly return to prevent any further execution
      
    } finally {
      console.log('useExpenseEdit handleSaveEdit finally block');
      setIsSaving(false);
    }
  }, [editedData, expenseId, onDataRefresh]);

  return {
    isEditing,
    editedData,
    expenseCategories,
    isLoadingCategories,
    isLoadingPlates,
    isSaving,
    saveError,
    handleEditClick,
    handleCancelEdit,
    handleFieldChange,
    handleItemChange,
    handleAddItem,
    handleDeleteItem,
    handleSaveEdit,
  };
};

export default useExpenseEdit;