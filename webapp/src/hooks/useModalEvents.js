import { useEffect } from 'react';

// Custom hook to automatically handle modal open/close events
export const useModalEvents = (isOpen, modalId = 'modal') => {
  useEffect(() => {
    if (isOpen) {
      // Dispatch events when modal opens
      window.dispatchEvent(new CustomEvent('modalOpen', { detail: { modalId } }));
    } else {
      // Dispatch events when modal closes
      window.dispatchEvent(new CustomEvent('modalClose', { detail: { modalId } }));
    }
  }, [isOpen, modalId]);
};

// Higher-order component to wrap existing modals with automatic event dispatching
export const withModalEvents = (WrappedComponent, modalId = 'modal') => {
  return function ModalWithEvents(props) {
    useModalEvents(props.open || props.isOpen, modalId);
    return <WrappedComponent {...props} />;
  };
};

export default useModalEvents;