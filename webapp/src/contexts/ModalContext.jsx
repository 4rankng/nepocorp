import React, { createContext, useContext, useState, useCallback } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [activeModals, setActiveModals] = useState(new Set());

  const registerModal = useCallback(modalId => {
    setActiveModals(prev => new Set([...prev, modalId]));
  }, []);

  const unregisterModal = useCallback(modalId => {
    setActiveModals(prev => {
      const newSet = new Set(prev);
      newSet.delete(modalId);
      return newSet;
    });
  }, []);

  const hasActiveModals = activeModals.size > 0;

  const value = {
    activeModals,
    hasActiveModals,
    registerModal,
    unregisterModal,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export default ModalContext;
