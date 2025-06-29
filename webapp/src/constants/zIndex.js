/**
 * Z-Index Management System
 * 
 * Systematic approach to manage z-index values across the application.
 * Based on Material-UI design principles and best practices.
 * 
 * Usage:
 * import { Z_INDEX } from '@constants/zIndex';
 * style={{ zIndex: Z_INDEX.MODAL }}
 */

export const Z_INDEX = {
  // Base layer - normal document flow
  BASE: 1,
  
  // Slightly elevated elements
  ELEVATED: 100,
  
  // Floating elements like tooltips and dropdowns
  FLOATING: 1000,
  DROPDOWN: 1100,
  POPOVER: 1200,
  
  // Overlay elements
  MODAL_BACKDROP: 1300,
  MODAL: 1400,
  DRAWER: 1500,
  
  // System-level notifications and alerts
  SNACKBAR: 1600,
  TOAST: 1700,
  
  // Critical system overlays
  SYSTEM_MODAL: 1800,
  LOADING_OVERLAY: 1900,
  
  // Maximum z-index for emergency use
  MAX: 2147483647 // Maximum 32-bit integer
};

/**
 * CSS Custom Properties for z-index values
 * Can be used in CSS files or styled-components
 */
export const Z_INDEX_CSS_VARS = {
  '--z-base': Z_INDEX.BASE,
  '--z-elevated': Z_INDEX.ELEVATED,
  '--z-floating': Z_INDEX.FLOATING,
  '--z-dropdown': Z_INDEX.DROPDOWN,
  '--z-popover': Z_INDEX.POPOVER,
  '--z-modal-backdrop': Z_INDEX.MODAL_BACKDROP,
  '--z-modal': Z_INDEX.MODAL,
  '--z-drawer': Z_INDEX.DRAWER,
  '--z-snackbar': Z_INDEX.SNACKBAR,
  '--z-toast': Z_INDEX.TOAST,
  '--z-system-modal': Z_INDEX.SYSTEM_MODAL,
  '--z-loading-overlay': Z_INDEX.LOADING_OVERLAY,
  '--z-max': Z_INDEX.MAX
};

/**
 * Helper function to get the next available z-index in a range
 * @param {number} baseZIndex - Base z-index value
 * @param {number} offset - Offset to add (default: 1)
 * @returns {number} - Next z-index value
 */
export const getNextZIndex = (baseZIndex, offset = 1) => {
  return baseZIndex + offset;
};

/**
 * Helper function to check if an element should use portal rendering
 * @param {number} zIndex - Z-index value to check
 * @returns {boolean} - Whether to use portal rendering
 */
export const shouldUsePortal = (zIndex) => {
  return zIndex >= Z_INDEX.FLOATING;
};