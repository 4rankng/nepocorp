import React from 'react';
import PropTypes from 'prop-types';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

const InvoiceActionButtons = ({
  isEditing,
  isSaving,
  invoiceData,
  onAddItem,
  onCancelEdit,
  onSaveEdit,
  onEditClick,
  onClose,
}) => {
  return (
    <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
      {isEditing ? (
        <>
          <button
            onClick={onAddItem}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
          >
            <AddIcon sx={{ fontSize: 16 }} />
            <span>Thêm dịch vụ</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancelEdit}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Hủy
            </button>
            <button
              onClick={onSaveEdit}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex justify-end gap-2 w-full">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
          {invoiceData && (
            <button
              onClick={onEditClick}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <EditIcon sx={{ fontSize: 16 }} />
              <span>Sửa</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

InvoiceActionButtons.propTypes = {
  isEditing: PropTypes.bool.isRequired,
  isSaving: PropTypes.bool.isRequired,
  invoiceData: PropTypes.object,
  onAddItem: PropTypes.func.isRequired,
  onCancelEdit: PropTypes.func.isRequired,
  onSaveEdit: PropTypes.func.isRequired,
  onEditClick: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default React.memo(InvoiceActionButtons);