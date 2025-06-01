import { useState, useCallback } from 'react';

export const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    confirmColor: 'primary',
    data: null,
    type: 'info',
    resolve: null,
  });

  const showConfirmation = useCallback(options => {
    return new Promise(resolve => {
      setConfirmationState({
        isOpen: true,
        title: options.title || 'Xác nhận',
        message: options.message || '',
        confirmText: options.confirmText || 'Xác nhận',
        cancelText: options.cancelText || 'Hủy',
        confirmColor: options.confirmColor || 'primary',
        data: options.data || null,
        type: options.type || 'info',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmationState.resolve) {
      confirmationState.resolve(true);
    }
    setConfirmationState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [confirmationState]);

  const handleCancel = useCallback(() => {
    if (confirmationState.resolve) {
      confirmationState.resolve(false);
    }
    setConfirmationState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [confirmationState]);

  return {
    showConfirmation,
    confirmationState,
    handleConfirm,
    handleCancel,
  };
};
