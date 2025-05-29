/**
 * Utility functions to improve mobile input experience
 */
/**
 * Prevents zoom on input focus and ensures proper viewport behavior
 * Call this function in a useEffect hook in your root component
 */
export const setupMobileInputHandlers = () => {
  if (typeof window === 'undefined') return;
  const handleFocus = e => {
    // Prevent zooming on input focus
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Ensure the input is at least 16px to prevent iOS zoom
      const computedFontSize = window.getComputedStyle(target).fontSize;
      if (parseInt(computedFontSize, 10) < 16) {
        target.style.fontSize = '16px';
        target.dataset.originalFontSize = computedFontSize;
      }
    }
  };
  const handleBlur = e => {
    // Restore original font size if it was changed
    const target = e.target;
    if (target.dataset.originalFontSize) {
      target.style.fontSize = target.dataset.originalFontSize;
      delete target.dataset.originalFontSize;
    }
  };
  // Add event listeners
  document.addEventListener('focusin', handleFocus);
  document.addEventListener('focusout', handleBlur);
  // Cleanup function
  return () => {
    document.removeEventListener('focusin', handleFocus);
    document.removeEventListener('focusout', handleBlur);
  };
};
/**
 * CSS to be added to your global styles to improve mobile input experience
 */
export const mobileInputStyles = `
  /* Prevent iOS from zooming on input focus */
  @media screen and (-webkit-min-device-pixel-ratio: 0) {
    input[type="color"],
    input[type="date"],
    input[type="datetime"],
    input[type="datetime-local"],
    input[type="email"],
    input[type="month"],
    input[type="number"],
    input[type="password"],
    input[type="search"],
    input[type="tel"],
    input[type="text"],
    input[type="time"],
    input[type="url"],
    input[type="week"],
    select:focus,
    textarea {
      font-size: 16px !important;
    }
  }
  /* Ensure inputs are large enough for touch targets */
  input, textarea, select, button {
    min-height: 44px;
  }
`;
