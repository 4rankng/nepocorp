import React, { useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { expenseApi } from '@services/api/expenseApi';
import { settingsApi } from '@services/api/settingsApi';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import useExpenseCategories from '@/hooks/useExpenseCategories';
import LicensePlateSelectionModal from './LicensePlateSelectionModal';
import ExpenseHeader from './expense/ExpenseHeader';
import ExpenseBasicInfo from './expense/ExpenseBasicInfo';
import ExpenseOptionalSections from './expense/ExpenseOptionalSections';
import ExpenseItemsTable from './expense/ExpenseItemsTable';
import ExpenseActionButtons from './expense/ExpenseActionButtons';
import ExpenseItemEditModal from './expense/ExpenseItemEditModal';
import { prepareExpenseItemsForUpdate, calculateExpenseTotal } from '@utils/expenseHelpers';
import { Z_INDEX, setParentZIndex } from '@constants/zIndex';

const ExpenseViewModal = ({ open, onClose, expenseId }) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);

  // Use global expense categories hook
  const {
    categories: expenseCategories,
    isLoading: isLoadingCategories,
    fetchCategories,
  } = useExpenseCategories();

  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);
  const [showItemEditModal, setShowItemEditModal] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  // Get license plates for dropdown
  const getAllLicensePlates = useCallback(() => {
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

  const fetchExpenseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getById(expenseId);
      const expenseData = response.data?.data || response.data || response;

      // Ensure items is always an array
      if (expenseData && !Array.isArray(expenseData.items)) {
        expenseData.items = expenseData.items ? [expenseData.items] : [];
      }

      setExpenseData(expenseData);
    } catch (err) {
      setError('Không thể tải thông tin phiếu thu');
      console.error('Error fetching expense data:', err);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    if (open && expenseId) {
      fetchExpenseData();
    }
  }, [open, expenseId, fetchExpenseData]);

  // Load tax rate when modal opens
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!open) return;

      // Check localStorage first
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
  }, [open]);

  // Fetch expense categories and vehicles when entering edit mode
  useEffect(() => {
    const fetchCategoriesIfNeeded = async () => {
      if (isEditing && expenseCategories.length === 0) {
        await fetchCategories();
      }
    };

    const fetchVehicles = async () => {
      if (isEditing && (tractors.length === 0 || trailers.length === 0)) {
        setIsLoadingPlates(true);
        try {
          await Promise.all([fetchTractors(), fetchTrailers()]);
        } catch (err) {
          console.error('Error fetching vehicles:', err);
        } finally {
          setIsLoadingPlates(false);
        }
      }
    };

    fetchCategoriesIfNeeded();
    fetchVehicles();
  }, [
    isEditing,
    expenseCategories.length,
    tractors.length,
    trailers.length,
    fetchTractors,
    fetchTrailers,
    fetchCategories,
  ]);

  const handleClose = useCallback(() => {
    setExpenseData(null);
    setError(null);
    setIsEditing(false);
    setEditedData(null);
    onClose();
  }, [onClose]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setEditedData({
      ...expenseData,
      items: expenseData.items.map(item => ({ ...item })),
    });
  }, [expenseData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
  }, []);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleEscKey = event => {
      if (event.key === 'Escape' && open && !showLicensePlateModal) {
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
  }, [open, isEditing, handleCancelEdit, handleClose, showLicensePlateModal]);

  const handleSaveEdit = useCallback(async () => {
    console.log('handleSaveEdit called');
    setIsSaving(true);
    setError(null);

    try {
      console.log('Starting validation...');

      // Basic validation
      if (!editedData.vendor_name?.trim()) {
        console.log('Validation failed: vendor_name');
        setError('Vui lòng nhập tên nhà cung cấp');
        return;
      }

      if (!editedData.expense_category_id) {
        console.log('Validation failed: expense_category_id');
        setError('Vui lòng chọn loại chi phí');
        return;
      }

      // Check if items have required license plates
      const itemsWithoutLicensePlate = editedData.items.filter(item => !item.license_plate?.trim());
      if (itemsWithoutLicensePlate.length > 0) {
        console.log('Validation failed: license plates missing');
        setError('Vui lòng chọn biển số xe cho tất cả hạng mục');
        return;
      }

      // Check if items have required names
      const itemsWithoutName = editedData.items.filter(item => !item.item_name?.trim());
      if (itemsWithoutName.length > 0) {
        console.log('Validation failed: item names missing');
        setError('Vui lòng nhập tên cho tất cả hạng mục');
        return;
      }

      console.log('Validation passed, preparing data...');

      const updatedItems = prepareExpenseItemsForUpdate(editedData.items);
      const totalAmount = calculateExpenseTotal(updatedItems);

      const updateData = {
        vendor_name: editedData.vendor_name,
        expense_category_id: editedData.expense_category_id,
        payment_status: editedData.payment_status,
        payment_proof: editedData.payment_proof || null,
        cancel_reason: editedData.cancel_reason || null,
        remark: editedData.remark,
        items: updatedItems,
        total: totalAmount,
      };

      console.log('Calling API update with data:', updateData);

      const apiResponse = await expenseApi.update(expenseId, updateData);
      console.log('API update successful:', apiResponse);

      // Only close editing mode if successful
      console.log('Refreshing data...');
      await fetchExpenseData();

      console.log('Success! Closing edit mode...');
      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      console.error('Caught error in handleSaveEdit:', err);

      // Extract error message from API response with more comprehensive error handling
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

      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
      console.error('Error updating expense:', err);
      console.error('Error response:', err.response);

      // IMPORTANT: Don't close modal or exit editing mode on error
      // The error will be displayed to the user and they can fix the issues
      return; // Explicitly return to prevent any further execution
    } finally {
      console.log('handleSaveEdit finally block');
      setIsSaving(false);
    }
  }, [editedData, expenseId, fetchExpenseData]);

  const handleFieldChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  }, []);

  const handleAddItem = useCallback(() => {
    setEditingItemIndex(null);
    setShowItemEditModal(true);
  }, []);

  const handleDeleteItem = useCallback(index => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

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

  // Handle item edit modal
  const handleItemEditModalClose = useCallback(() => {
    setShowItemEditModal(false);
    setEditingItemIndex(null);
  }, []);

  const handleItemSave = useCallback(
    itemData => {
      if (editingItemIndex !== null) {
        // Edit existing item
        setEditedData(prev => ({
          ...prev,
          items: prev.items.map((item, index) => (index === editingItemIndex ? itemData : item)),
        }));
      } else {
        // Add new item
        setEditedData(prev => ({
          ...prev,
          items: [...prev.items, itemData],
        }));
      }
      setShowItemEditModal(false);
      setEditingItemIndex(null);
    },
    [editingItemIndex]
  );

  if (!open) return null;

  return (
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
          expenseData={expenseData}
          loading={loading}
          isEditing={isEditing}
          editedData={editedData}
          onClose={handleClose}
          onFieldChange={handleFieldChange}
        />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-2 text-sm">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div
              className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-800 text-sm mb-4 shadow-lg animate-pulse"
              ref={el => {
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="font-medium">Lỗi: {error}</div>
              </div>
            </div>
          )}

          {expenseData && !loading && (
            <>
              <ExpenseBasicInfo
                expenseData={expenseData}
                isEditing={isEditing}
                editedData={editedData}
                onFieldChange={handleFieldChange}
                expenseCategories={expenseCategories}
                isLoadingCategories={isLoadingCategories}
                isInModal={true}
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
                items={isEditing ? editedData.items : expenseData.items}
                isEditing={isEditing}
                onItemChange={handleItemChange}
                onDeleteItem={handleDeleteItem}
                onLicensePlateCellClick={handleLicensePlateCellClick}
                total={expenseData.total}
                licensePlates={getAllLicensePlates()}
                isLoadingPlates={isLoadingPlates}
                taxRate={taxRate}
              />
            </>
          )}
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
        <ExpenseItemEditModal
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
    </div>
  );
};

ExpenseViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  expenseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(ExpenseViewModal);
