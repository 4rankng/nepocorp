import React from 'react';
import './Modal.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  className = '',
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sizeClass = {
    small: 'modal-container--small',
    medium: 'modal-container--medium',
    large: 'modal-container--large',
    fullWidth: 'modal-container--full-width'
  }[size];

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container ${sizeClass} ${className}`}>
        <div className="modal-content">
          {title && (
            <div className="modal-header">
              <h2 className="modal-title">{title}</h2>
              {showCloseButton && (
                <button 
                  className="modal-close-button" 
                  onClick={onClose}
                  aria-label="Đóng"
                >
                  ×
                </button>
              )}
            </div>
          )}
          <div className="modal-body">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;