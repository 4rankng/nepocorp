import React, { useState, useEffect, useCallback, useContext } from 'react';
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
import { formatCurrency } from '@utils/format';
import { prepareInvoiceItemsForUpdate, calculateInvoiceTotal } from '@utils/invoiceHelpers';
import { Z_INDEX } from '@constants/zIndex';


const InvoiceForm = ({
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
  title = null,
}) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  
  // Simulate invoice data structure for add mode
  const invoiceData = isEdit ? formData : {
    customer_id: '',
    invoice_category_id: '',
    payment_status: INVOICE_STATUS.DRAFT,
    payment_proof: '',
    items: [],
    remark: '',
    total: 0
  };

  const [editedData, setEditedData] = useState(null);

  const [invoiceCategories, setInvoiceCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showItemEditModal, setShowItemEditModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

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
        customer_id: '',
        invoice_category_id: '',
        payment_status: INVOICE_STATUS.DRAFT,
        payment_proof: '',
        items: [],
        remark: ''
      };
      setEditedData(initialData);
    }
  }, [open, isEdit, formData, taxRate]);

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

  // Get license plates for dropdown
  const getAllLicensePlates = useCallback(() => {
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
    setEditedData(null);
    setError(null);
    onClose();
  }, [onClose]);

  const handleFieldChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
    onChange({ target: { name: field, value } });
  }, [onChange]);

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

  // Handle item edit modal
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

  // Placeholder functions for components that need them but aren't used in add mode
  const handleEditClick = useCallback(() => {}, []);
  const handleCancelEdit = useCallback(() => {
    handleClose();
  }, [handleClose]);

  const handleSaveEdit = useCallback(async () => {
    setIsSaving(true);
    setError(null);
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
        total: totalAmount
      };

      // Update the onChange to reflect final data
      onChange({ target: { name: 'formData', value: saveData } });
      await onSave();
      handleClose();
    } catch (err) {
      setError('Không thể lưu hóa đơn');
      console.error('Error saving invoice:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, onChange, onSave, handleClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSaveEdit();
  };

  if (!open || !editedData) return null;

  // Adapt invoice categories for ExpenseBasicInfo component
  const adaptedInvoiceCategories = invoiceCategories.map(category => ({
    id: category.id,
    name: category.name
  }));

  // Adapt customers data for use in ExpenseBasicInfo
  const adaptedCustomers = customers.map(customer => ({
    id: customer.id,
    name: `${customer.name} (${customer.tax_code})`
  }));

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center p-1" style={{zIndex: Z_INDEX.MODAL_BACKDROP}}>
        <div className="bg-white rounded-lg w-full max-w-[98vw] max-h-[98vh] flex flex-col" style={{zIndex: Z_INDEX.MODAL}}>
          <ExpenseHeader
            expenseData={invoiceData}
            loading={false}
            isEditing={isEditing}
            editedData={editedData}
            onClose={handleClose}
            onFieldChange={handleFieldChange}
            title={title || (isEdit ? 'Sửa hóa đơn' : 'Thêm hóa đơn mới')}
            statusOptions={Object.entries(INVOICE_STATUS).map(([key, value]) => ({
              value: value,
              label: INVOICE_STATUS_LABELS[value]
            }))}
          />

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-2">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
                {error}
              </div>
            )}

            <ExpenseBasicInfo
              expenseData={invoiceData}
              isEditing={isEditing}
              editedData={editedData}
              onFieldChange={handleFieldChange}
              expenseCategories={adaptedInvoiceCategories}
              isLoadingCategories={isLoadingCategories}
              isInvoiceMode={true}
              customers={adaptedCustomers}
              isLoadingCustomers={isLoadingCustomers}
            />

            <ExpenseOptionalSections
              expenseData={invoiceData}
              isEditing={isEditing}
              editedData={editedData}
              onFieldChange={handleFieldChange}
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
              licensePlates={getAllLicensePlates()}
              isLoadingPlates={isLoadingPlates}
              taxRate={taxRate}
            />
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
      </div>

      {showLicensePlateModal && (
        <LicensePlateSelectionModal
          open={showLicensePlateModal}
          onClose={() => setShowLicensePlateModal(false)}
          onSelect={handleLicensePlateSelect}
          licensePlates={getAllLicensePlates()}
          isLoading={isLoadingPlates}
        />
      )}

      {showItemEditModal && (
        <InvoiceItemEditModal
          isOpen={showItemEditModal}
          onClose={handleItemEditModalClose}
          onSave={handleItemSave}
          item={editingItemIndex !== null ? editedData.items[editingItemIndex] : null}
          isEdit={editingItemIndex !== null}
          licensePlates={getAllLicensePlates()}
          isLoadingPlates={isLoadingPlates}
          taxRate={taxRate}
        />
      )}

    </>
  );
};

export default InvoiceForm;