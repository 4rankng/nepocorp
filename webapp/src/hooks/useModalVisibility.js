import { useState, useEffect } from 'react';

// Custom hook to detect if any modals are open
export const useModalVisibility = () => {
  const [activeModals, setActiveModals] = useState(new Set());

  useEffect(() => {
    // Listen for custom events from any modal components
    const handleModalOpen = (event) => {
      const modalId = event.detail?.modalId || 'unknown';
      setActiveModals(prev => new Set([...prev, modalId]));
    };

    const handleModalClose = (event) => {
      const modalId = event.detail?.modalId || 'unknown';
      setActiveModals(prev => {
        const newSet = new Set(prev);
        newSet.delete(modalId);
        return newSet;
      });
    };

    // Listen for both specific profile modals and general modal events
    window.addEventListener('profileModalOpen', handleModalOpen);
    window.addEventListener('profileModalClose', handleModalClose);
    window.addEventListener('modalOpen', handleModalOpen);
    window.addEventListener('modalClose', handleModalClose);

    return () => {
      window.removeEventListener('profileModalOpen', handleModalOpen);
      window.removeEventListener('profileModalClose', handleModalClose);
      window.removeEventListener('modalOpen', handleModalOpen);
      window.removeEventListener('modalClose', handleModalClose);
    };
  }, []);

  const hasActiveModal = activeModals.size > 0;
  const hasActiveProfileModal = hasActiveModal; // Keep for backward compatibility

  return { 
    hasActiveModal, 
    hasActiveProfileModal, // Deprecated but kept for compatibility
    activeModals 
  };
};