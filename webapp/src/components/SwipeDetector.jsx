import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
const SwipeDetector = ({ children, onSwipeLeft, onSwipeRight }) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const handleTouchStart = useCallback(e => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);
  const handleTouchEnd = useCallback(
    e => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;
      // Only process horizontal swipes (ignore vertical scrolling)
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;
      const minDistance = 50; // Minimum distance for a swipe to be registered
      if (Math.abs(deltaX) > minDistance) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight]
  );
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Add event listeners with passive: true for better scroll performance
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);
  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%', // Ensure the detector covers the intended area
        touchAction: 'pan-y', // Allow vertical scrolling, handle horizontal swipes manually
      }}
    >
      {children}
    </Box>
  );
};
export default SwipeDetector;
