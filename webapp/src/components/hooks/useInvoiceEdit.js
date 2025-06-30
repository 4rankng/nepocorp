import { useState, useCallback, useEffect } from 'react';
import { invoiceApi } from '@services/api/invoiceApi';
import { INVOICE_STATUS } from '@constants/invoice';

const useInvoiceEdit = (invoiceData, invoiceId, onDataRefresh, fetchTractors, fetchTrailers, isAddMode = false) => {
  const [isEditing, setIsEditing] = useState(isAddMode);
  const [editedData, setEditedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [showItemEditModal, setShowItemEditModal] = useState(false);

  // Status change prompts
  const [showPaymentProofPrompt, setShowPaymentProofPrompt] = useState(false);
  const [showCancelReasonPrompt, setShowCancelReasonPrompt] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [tempPaymentProof, setTempPaymentProof] = useState('');
  const [tempCancelReason, setTempCancelReason] = useState('');

  // Initialize for add mode
  useEffect(() => {
    if (isAddMode && invoiceData && !editedData) {
      setEditedData({
        ...invoiceData,
        items: invoiceData.items?.map(item => ({ ...item })) || []
      });
    }
  }, [isAddMode, invoiceData, editedData]);

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
    if (!invoiceData) return;

    setIsEditing(true);
    setEditedData({
      ...invoiceData,
      items: invoiceData.items?.map(item => ({ ...item })) || []
    });
  }, [invoiceData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
    setSaveError(null);
    setShowPaymentProofPrompt(false);
    setShowCancelReasonPrompt(false);
    setPendingStatus(null);
    setTempPaymentProof('');
    setTempCancelReason('');
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

  const handleItemEditModalClose = useCallback(() => {
    setShowItemEditModal(false);
    setEditingItemIndex(null);
  }, []);

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
    setShowItemEditModal(false);
    setEditingItemIndex(null);
  }, [editingItemIndex]);

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
    if (!editedData) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Calculate totals for items
      const updatedItems = editedData.items?.map(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const total = price * quantity;

        return {
          ...item,
          price,
          quantity,
          total
        };
      }) || [];

      const totalAmount = updatedItems.reduce((sum, item) => sum + item.total, 0);

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
      await onDataRefresh();
      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      setSaveError('Không thể cập nhật phiếu thu');
      console.error('Error updating invoice:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, invoiceId, onDataRefresh]);

  return {
    isEditing,
    editedData,
    isLoadingPlates,
    isSaving,
    saveError,
    showPaymentProofPrompt,
    showCancelReasonPrompt,
    tempPaymentProof,
    tempCancelReason,
    editingItemIndex,
    showItemEditModal,
    handleEditClick,
    handleCancelEdit,
    handleFieldChange,
    handleItemChange,
    handleAddItem,
    handleDeleteItem,
    handleItemEditModalClose,
    handleItemSave,
    handleSaveEdit,
    handlePaymentProofConfirm,
    handleCancelReasonConfirm,
    handlePromptCancel,
    setTempPaymentProof,
    setTempCancelReason,
    setEditingItemIndex,
    setShowItemEditModal,
  };
};

export default useInvoiceEdit;
