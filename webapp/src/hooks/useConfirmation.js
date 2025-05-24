import { useState, useCallback } from 'react';

const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState({
    isOpen: false,
    title: 'Xác nhận',
    message: 'Bạn có chắc chắn muốn thực hiện thao tác này?',
    onConfirm: () => {},
    onCancel: () => {},
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    confirmColor: 'primary',
  });

  const confirm = useCallback(({
    title = 'Xác nhận',
    message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    confirmColor = 'primary',
  }) => {
    return new Promise((resolve) => {
      setConfirmationState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        confirmColor,
        onConfirm: () => {
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmationState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const ConfirmationDialog = useCallback(() => {
    const {
      isOpen,
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      confirmColor,
    } = confirmationState;

    return (
      <ConfirmationDialog
        open={isOpen}
        title={title}
        message={message}
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmText={confirmText}
        cancelText={cancelText}
        confirmColor={confirmColor}
      />
    );
  }, [confirmationState]);

  return { confirm, ConfirmationDialog };
};

export default useConfirmation;
