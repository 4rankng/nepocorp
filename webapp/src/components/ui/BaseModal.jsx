import React, { useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Z_INDEX, setParentZIndex } from '@constants/zIndex';

/**
 * BaseModal - Universal modal foundation component
 * Combines the best patterns from ExpenseViewModal, UI Modal, and Material-UI Dialog
 */
const BaseModal = ({
  open,
  onClose,
  children,
  size = 'lg',
  className = '',
  style = {},
  disableEscapeKeyDown = false,
  disableBackdropClick = false,
  zIndex = Z_INDEX.MODAL,
  backdropZIndex = Z_INDEX.MODAL_BACKDROP,
  animate = true,
  id,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  role = 'dialog',
}) => {
  const modalRef = useRef(null);
  const backdropRef = useRef(null);

  // Size configurations matching existing patterns
  const sizeConfig = {
    sm: 'w-full max-w-md',
    md: 'w-full max-w-2xl',
    lg: 'w-full max-w-4xl',
    xl: 'w-full max-w-6xl',
    fullScreen: 'w-full max-w-[98vw] max-h-[98vh]',
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = event => {
      if (event.key === 'Escape' && open && !disableEscapeKeyDown) {
        // Check if this is the topmost modal by comparing z-index
        const allModals = document.querySelectorAll('[data-modal]');
        let isTopmost = true;

        if (allModals.length > 1) {
          const currentModal = modalRef.current;
          if (currentModal) {
            const currentZIndex =
              parseInt(getComputedStyle(currentModal.parentElement).zIndex) || 0;

            for (const modal of allModals) {
              if (modal !== currentModal.parentElement) {
                const modalZIndex = parseInt(getComputedStyle(modal).zIndex) || 0;
                if (modalZIndex > currentZIndex) {
                  isTopmost = false;
                  break;
                }
              }
            }
          }
        }

        if (isTopmost) {
          onClose(event, 'escapeKeyDown');
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, disableEscapeKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    event => {
      if (event.target === backdropRef.current && !disableBackdropClick) {
        onClose(event, 'backdropClick');
      }
    },
    [onClose, disableBackdropClick]
  );

  // Focus management and z-index inheritance setup
  useEffect(() => {
    if (open && modalRef.current) {
      const previousActiveElement = document.activeElement;

      // Set up z-index inheritance for child components
      setParentZIndex(modalRef.current, zIndex);

      // Focus the modal
      modalRef.current.focus();

      return () => {
        // Restore focus when modal closes
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus();
        }
      };
    }
  }, [open, zIndex]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [open]);

  if (!open) return null;

  const modalClasses = `
    bg-white rounded-lg flex flex-col
    ${sizeConfig[size]}
    ${animate ? 'animate-in fade-in zoom-in-95 duration-200' : ''}
    ${className}
  `.trim();

  const backdropClasses = `
    fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-1
    ${animate ? 'animate-in fade-in duration-200' : ''}
  `.trim();

  return (
    <div
      ref={backdropRef}
      className={backdropClasses}
      style={{ zIndex: backdropZIndex }}
      onClick={handleBackdropClick}
      data-modal
      aria-hidden={!open}
    >
      <div
        ref={modalRef}
        className={modalClasses}
        style={{ zIndex, ...style }}
        onClick={e => e.stopPropagation()}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        id={id}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};

BaseModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'fullScreen']),
  className: PropTypes.string,
  style: PropTypes.object,
  disableEscapeKeyDown: PropTypes.bool,
  disableBackdropClick: PropTypes.bool,
  zIndex: PropTypes.number,
  backdropZIndex: PropTypes.number,
  animate: PropTypes.bool,
  id: PropTypes.string,
  'aria-labelledby': PropTypes.string,
  'aria-describedby': PropTypes.string,
  role: PropTypes.string,
};

export default BaseModal;
