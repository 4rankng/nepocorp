import { useState, useCallback } from 'react';
import { FORM_MODES } from '@/features/bang-cong-no/types';

export const useTransactionModal = () => {
  const [modalState, setModalState] = useState({
    open: false,
    mode: FORM_MODES.CREATE,
    transaction: null,
  });

  const [viewModalState, setViewModalState] = useState({
    open: false,
    transaction: null,
  });

  // Transaction form modal handlers
  const openCreateModal = useCallback(() => {
    setModalState({
      open: true,
      mode: FORM_MODES.CREATE,
      transaction: null,
    });
  }, []);

  const openEditModal = useCallback(transaction => {
    setModalState({
      open: true,
      mode: FORM_MODES.EDIT,
      transaction,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({
      open: false,
      mode: FORM_MODES.CREATE,
      transaction: null,
    });
  }, []);

  // Transaction view modal handlers
  const openViewModal = useCallback(transaction => {
    setViewModalState({
      open: true,
      transaction,
    });
  }, []);

  const closeViewModal = useCallback(() => {
    setViewModalState({
      open: false,
      transaction: null,
    });
  }, []);

  // Combined handlers for convenience
  const handleView = useCallback(
    transaction => {
      openViewModal(transaction);
    },
    [openViewModal]
  );

  const handleEdit = useCallback(
    transaction => {
      closeViewModal(); // Close view modal if open
      openEditModal(transaction);
    },
    [closeViewModal, openEditModal]
  );

  const handleCreate = useCallback(() => {
    closeViewModal(); // Close view modal if open
    openCreateModal();
  }, [closeViewModal, openCreateModal]);

  const handleEditFromView = useCallback(
    transaction => {
      closeViewModal();
      openEditModal(transaction);
    },
    [closeViewModal, openEditModal]
  );

  return {
    // Form modal state
    modalOpen: modalState.open,
    modalMode: modalState.mode,
    modalTransaction: modalState.transaction,

    // View modal state
    viewModalOpen: viewModalState.open,
    viewModalTransaction: viewModalState.transaction,

    // Form modal actions
    openCreateModal,
    openEditModal,
    closeModal,

    // View modal actions
    openViewModal,
    closeViewModal,

    // Combined actions
    handleView,
    handleEdit,
    handleCreate,
    handleEditFromView,

    // Utility getters
    isCreating: modalState.mode === FORM_MODES.CREATE,
    isEditing: modalState.mode === FORM_MODES.EDIT,
    isViewing: viewModalState.open,
  };
};
