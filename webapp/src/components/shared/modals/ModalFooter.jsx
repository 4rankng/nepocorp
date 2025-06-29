import React from 'react';
import PropTypes from 'prop-types';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';

const ModalFooter = ({
  isEditing = false,
  onEdit,
  onSave,
  onCancel,
  onClose,
  onAddItem,
  isSaving = false,
  showAddButton = false,
  addButtonText = 'Thêm',
  editButtonText = 'Sửa',
  saveButtonText = 'Lưu',
  cancelButtonText = 'Hủy',
  closeButtonText = 'Đóng',
  addButtonIcon = <AddIcon sx={{ fontSize: 16 }} />,
  editButtonIcon = <EditIcon sx={{ fontSize: 16 }} />,
  extraButtons = null,
}) => {
  return (
    <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
      {isEditing ? (
        <>
          {/* Left side - Add button when editing */}
          <div className="flex items-center gap-2">
            {showAddButton && onAddItem && (
              <button
                onClick={onAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                {addButtonIcon}
                <span>{addButtonText}</span>
              </button>
            )}
            {extraButtons}
          </div>
          
          {/* Right side - Cancel and Save */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              {cancelButtonText}
            </button>
            <button
              onClick={onSave}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSaving}
            >
              {isSaving ? 'Đang lưu...' : saveButtonText}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* View mode - Close and Edit buttons */}
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
            >
              {closeButtonText}
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                {editButtonIcon}
                <span>{editButtonText}</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

ModalFooter.propTypes = {
  isEditing: PropTypes.bool,
  onEdit: PropTypes.func,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  onClose: PropTypes.func.isRequired,
  onAddItem: PropTypes.func,
  isSaving: PropTypes.bool,
  showAddButton: PropTypes.bool,
  addButtonText: PropTypes.string,
  editButtonText: PropTypes.string,
  saveButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  closeButtonText: PropTypes.string,
  addButtonIcon: PropTypes.node,
  editButtonIcon: PropTypes.node,
  extraButtons: PropTypes.node,
};

export default React.memo(ModalFooter);