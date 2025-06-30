import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Z_INDEX } from '@constants/zIndex';

const StandardModal = ({ 
  open, 
  onClose, 
  children,
  className = '',
  style = {},
  disableEscapeKeyDown = false
}) => {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape' && open && !disableEscapeKeyDown) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [open, onClose, disableEscapeKeyDown]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-1" 
      style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
    >
      <div 
        className={`bg-white rounded-lg w-full max-w-[98vw] max-h-[98vh] flex flex-col ${className}`}
        style={{ zIndex: Z_INDEX.MODAL, ...style }}
      >
        {children}
      </div>
    </div>
  );
};

StandardModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
  disableEscapeKeyDown: PropTypes.bool
};

export default StandardModal;