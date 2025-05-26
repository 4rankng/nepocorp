import { useEffect } from 'react';
import { setupMobileInputHandlers } from '@/utils/mobileInput';

/**
 * Component that sets up mobile input handlers to prevent zooming issues
 * and improve mobile input experience.
 */
const MobileInputHandler = () => {
  useEffect(() => {
    // Setup mobile input handlers when component mounts
    const cleanup = setupMobileInputHandlers();
    
    // Cleanup on unmount
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  return null; // This component doesn't render anything
};

export default MobileInputHandler;
