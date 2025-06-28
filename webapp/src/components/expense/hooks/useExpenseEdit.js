import { useState, useCallback, useEffect } from 'react';
import { expenseApi } from '@services/api/expenseApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import { settingsApi } from '@services/api/settingsApi';

const useExpenseEdit = (expenseData, expenseId, onDataRefresh) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [taxRate, setTaxRate] = useState(10);

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

  const handleSaveEdit = useCallback(async () => {
    if (!editedData) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
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

      await expenseApi.update(expenseId, updateData);
      
      // Refresh the expense data
      await onDataRefresh();
      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      setSaveError('Không thể cập nhật phiếu chi');
      console.error('Error updating expense:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, expenseId, onDataRefresh]);

  return {
    isEditing,
    editedData,
    expenseCategories,
    isLoadingCategories,
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