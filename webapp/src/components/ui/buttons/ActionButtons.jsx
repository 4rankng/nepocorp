import React from 'react';
import Button from '../Button';

const ActionButtons = ({
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
  viewText = 'Xem',
  editText = 'Sửa',
  deleteText = 'Xóa',
  disabled = false,
  size = 'small',
  className = '',
  ...props
}) => {
  const ViewIcon = () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path
        fillRule="evenodd"
        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  const EditIcon = () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );

  const DeleteIcon = () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path
        fillRule="evenodd"
        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 012 0v6a1 1 0 11-2 0V8z"
      />
    </svg>
  );

  return (
    <div className={`action-buttons ${className}`} {...props}>
      {showView && (
        <Button
          variant="ghost"
          size={size}
          onClick={onView}
          disabled={disabled}
          icon={<ViewIcon />}
          iconOnly
          title={viewText}
        >
          {viewText}
        </Button>
      )}
      {showEdit && (
        <Button
          variant="ghost"
          size={size}
          onClick={onEdit}
          disabled={disabled}
          icon={<EditIcon />}
          iconOnly
          title={editText}
        >
          {editText}
        </Button>
      )}
      {showDelete && (
        <Button
          variant="ghost"
          size={size}
          onClick={onDelete}
          disabled={disabled}
          icon={<DeleteIcon />}
          iconOnly
          title={deleteText}
        >
          {deleteText}
        </Button>
      )}
    </div>
  );
};

export default ActionButtons;
