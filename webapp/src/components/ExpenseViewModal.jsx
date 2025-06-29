import React, { useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { expenseApi } from '@services/api/expenseApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import { settingsApi } from '@services/api/settingsApi';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import LicensePlateSelectionModal from './LicensePlateSelectionModal';
import ExpenseHeader from './expense/ExpenseHeader';
import ExpenseBasicInfo from './expense/ExpenseBasicInfo';
import ExpenseOptionalSections from './expense/ExpenseOptionalSections';
import ExpenseItemsTable from './expense/ExpenseItemsTable';
import ExpenseActionButtons from './expense/ExpenseActionButtons';
import { prepareExpenseItemsForUpdate, calculateExpenseTotal } from '@utils/expenseHelpers';
import { Z_INDEX } from '@constants/zIndex';

const ExpenseViewModal = ({ open, onClose, expenseId }) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);

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
      setError('Không thể tải thông tin hóa đơn');
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

    const fetchVehicles = async () => {
      if (isEditing && (tractors.length === 0 || trailers.length === 0)) {
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
      }
    };

    fetchCategories();
    fetchVehicles();
  }, [isEditing, expenseCategories.length, tractors.length, trailers.length, fetchTractors, fetchTrailers]);

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
      items: expenseData.items.map(item => ({ ...item }))
    });
  }, [expenseData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
  }, []);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleEscKey = (event) => {
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
    setIsSaving(true);
    setError(null);
    try {
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
        total: totalAmount
      };

      await expenseApi.update(expenseId, updateData);

      // Refresh the expense data
      await fetchExpenseData();
      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      setError('Không thể cập nhật phiếu chi');
      console.error('Error updating expense:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, expenseId, fetchExpenseData]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center p-1" style={{zIndex: Z_INDEX.MODAL_BACKDROP}}>
      <div className="bg-white rounded-lg w-full max-w-[98vw] h-[98vh]" style={{zIndex: Z_INDEX.MODAL, overflow: 'visible'}}>
        <ExpenseHeader
          expenseData={expenseData}
          loading={loading}
          isEditing={isEditing}
          editedData={editedData}
          onClose={handleClose}
          onFieldChange={handleFieldChange}
        />

        {/* Modal Body */}
        <div className="relative" style={{overflow: 'visible'}}>
          <div className="p-2 overflow-y-auto h-[85vh]" style={{borderRadius: '0 0 0.5rem 0.5rem'}}>
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
              />
            </>
          )}
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

      {showLicensePlateModal && (
        <LicensePlateSelectionModal
          open={showLicensePlateModal}
          onClose={() => setShowLicensePlateModal(false)}
          onSelect={handleLicensePlateSelect}
          licensePlates={getAllLicensePlates()}
          isLoading={isLoadingPlates}
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