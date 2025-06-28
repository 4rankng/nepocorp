import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import Dropdown from '@components/ui/Dropdown';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';

// Custom components
import StatusBadge from './components/StatusBadge';
import ExpenseFormFields from './components/ExpenseFormFields';
import PaymentProofSection from './components/PaymentProofSection';
import ExpenseItemsTable from './components/ExpenseItemsTable';

// Custom hooks
import useExpenseData from './hooks/useExpenseData';
import useExpenseEdit from './hooks/useExpenseEdit';

const ExpenseViewModal = ({ open, onClose, expenseId }) => {
  const { expenseData, loading, error, refreshData } = useExpenseData(expenseId, open);
  
  const {
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
  } = useExpenseEdit(expenseData, expenseId, refreshData);

  const handleClose = useCallback(() => {
    handleCancelEdit();
    onClose();
  }, [handleCancelEdit, onClose]);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
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
  }, [open, isEditing, handleCancelEdit, handleClose]);

  if (!open) return null;

  const displayData = isEditing ? editedData : expenseData;
  const displayError = error || saveError;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Chi tiết phiếu chi</h1>
            {expenseData && !loading && (
              <>
                {isEditing ? (
                  <Dropdown
                    value={editedData.payment_status}
                    onChange={(value) => handleFieldChange('payment_status', value)}
                    options={Object.entries(PAYMENT_STATUS).map(([key, value]) => ({
                      value: value,
                      label: PAYMENT_STATUS_LABELS[value]
                    }))}
                    placeholder="Chọn trạng thái"
                    className="text-xs"
                    style={{ minWidth: '120px' }}
                  />
                ) : (
                  <>
                    <StatusBadge status={expenseData.payment_status} />
                    {expenseData.payment_status === 'PAID' && (
                      expenseData.payment_proof ? (
                        <button
                          onClick={() => window.open(expenseData.payment_proof, '_blank')}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          title="Xem chứng từ thanh toán"
                        >
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                          <span>Xem chứng từ</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-400 text-xs font-medium rounded cursor-not-allowed"
                          title="Chưa có chứng từ"
                        >
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                          <span>Chưa có chứng từ</span>
                        </button>
                      )
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {displayError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
              {displayError}
            </div>
          )}

          {displayData && !loading && (
            <>
              {/* Basic Information */}
              <ExpenseFormFields
                data={displayData}
                isEditing={isEditing}
                expenseCategories={expenseCategories}
                isLoadingCategories={isLoadingCategories}
                onFieldChange={handleFieldChange}
              />

              {/* Payment Proof Section */}
              <PaymentProofSection
                data={displayData}
                isEditing={isEditing}
                onFieldChange={handleFieldChange}
              />

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Items Table */}
              <ExpenseItemsTable
                items={displayData.items || []}
                isEditing={isEditing}
                onItemChange={handleItemChange}
                onAddItem={handleAddItem}
                onDeleteItem={handleDeleteItem}
              />
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {expenseData && (
                <button
                  onClick={handleEditClick}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                  <span>Sửa</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

ExpenseViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  expenseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(ExpenseViewModal);