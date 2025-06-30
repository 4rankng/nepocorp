import React from 'react';
import './Modal.css';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  className = '',
  showCloseButton = true,
  zIndexLayer = 'nested-modal', // Default to nested modal layer
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = e => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClass = {
    small: 'modal-container--small',
    medium: 'modal-container--medium',
    large: 'modal-container--large',
    fullWidth: 'modal-container--full-width',
  }[size];

  // Dynamic z-index based on layer prop
  const overlayStyle = {
    zIndex: `var(--z-index-${zIndexLayer}, 900)`,
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} style={overlayStyle}>
      <div className={`modal-container ${sizeClass} ${className}`}>
        <div className="modal-content">
          {title && (
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              {showCloseButton && (
                <button className="modal-close-button" onClick={onClose} aria-label="Đóng">
                  ×
                </button>
              )}
            </div>
          )}
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
