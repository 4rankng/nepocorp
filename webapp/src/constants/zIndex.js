/**
 * Programmatic Z-Index Management System
 * 
 * This system eliminates magic numbers by defining all z-index layers in a single,
 * ordered list and programmatically generating the CSS values. This approach provides
 * clarity, maintainability, and confidence when making changes.
 * 
 * Usage:
 * import { Z_INDEX } from '@constants/zIndex';
 * style={{ zIndex: Z_INDEX.modal }}
 * 
 * CSS Usage:
 * .modal { z-index: var(--z-index-modal); }
 */

/**
 * Creates z-index values from an ordered array of layer names
 * @param {string[]} layers - Array of layer names in stacking order (bottom to top)
 * @param {number} multiplier - Spacing between layers (default: 100)
 * @returns {Object} Object with layer names as keys and z-index values
 */
const makeZIndexes = (layers, multiplier = 100) => {
  return layers.reduce((acc, layer, index) => {
    // Start from 1 to avoid z-index: 0 issues
    acc[layer] = (index + 1) * multiplier;
    return acc;
  }, {});
};

/**
 * Define all z-index layers in desired stacking order (bottom to top)
 * To reorder layers, simply change their position in this array
 */
const Z_INDEX_LAYERS = [
  'base',                    // Normal document flow
  'elevated',                // Slightly elevated elements  
  'floating',                // Floating elements like tooltips
  'dropdown',                // Dropdown menus
  'popover',                 // Popovers and tooltips
  'modal-backdrop',          // Modal backdrops
  'modal',                   // Standard modals
  'nested-modal-backdrop',   // Nested modal backdrops
  'nested-modal',            // Nested modals (like item edit within invoice)
  'drawer',                  // Side drawers
  'snackbar',                // Notification snackbars
  'toast',                   // Toast notifications
  'system-modal',            // Critical system modals
  'loading-overlay',         // Loading overlays
  'error-overlay'            // Error overlays (highest priority)
];

/**
 * Generated z-index values - DO NOT MODIFY MANUALLY
 * These values are automatically calculated from Z_INDEX_LAYERS
 */
const GENERATED_Z_INDEXES = makeZIndexes(Z_INDEX_LAYERS);

/**
 * Main Z_INDEX export for JavaScript usage
 * Maintains backward compatibility with existing code
 */
export const Z_INDEX = {
  // Generated values with semantic names
  BASE: GENERATED_Z_INDEXES.base,
  ELEVATED: GENERATED_Z_INDEXES.elevated,
  FLOATING: GENERATED_Z_INDEXES.floating,
  DROPDOWN: GENERATED_Z_INDEXES.dropdown,
  POPOVER: GENERATED_Z_INDEXES.popover,
  MODAL_BACKDROP: GENERATED_Z_INDEXES['modal-backdrop'],
  MODAL: GENERATED_Z_INDEXES.modal,
  NESTED_MODAL_BACKDROP: GENERATED_Z_INDEXES['nested-modal-backdrop'],
  NESTED_MODAL: GENERATED_Z_INDEXES['nested-modal'],
  DRAWER: GENERATED_Z_INDEXES.drawer,
  SNACKBAR: GENERATED_Z_INDEXES.snackbar,
  TOAST: GENERATED_Z_INDEXES.toast,
  SYSTEM_MODAL: GENERATED_Z_INDEXES['system-modal'],
  LOADING_OVERLAY: GENERATED_Z_INDEXES['loading-overlay'],
  ERROR_OVERLAY: GENERATED_Z_INDEXES['error-overlay'],
  
  // Legacy compatibility
  MAX: 2147483647
};

/**
 * CSS Custom Properties for use in CSS files
 * These are automatically generated and injected into the document root
 */
export const Z_INDEX_CSS_VARS = Object.keys(GENERATED_Z_INDEXES).reduce((acc, layer) => {
  acc[`--z-${layer}`] = GENERATED_Z_INDEXES[layer];
  return acc;
}, {});

/**
 * Helper function to get the next available z-index in a range
 * @param {string} layerName - Layer name from Z_INDEX_LAYERS
 * @param {number} offset - Offset to add (default: 1)
 * @returns {number} - Next z-index value
 */
export const getNextZIndex = (layerName, offset = 1) => {
  const baseValue = GENERATED_Z_INDEXES[layerName];
  if (!baseValue) {
    console.warn(`Unknown z-index layer: ${layerName}`);
    return 1000; // Fallback
  }
  return baseValue + offset;
};

/**
 * Helper function to check if an element should use portal rendering
 * @param {number} zIndex - Z-index value to check
 * @returns {boolean} - Whether to use portal rendering
 */
export const shouldUsePortal = (zIndex) => {
  return zIndex >= Z_INDEX.FLOATING;
};

/**
 * Helper function to detect z-index context from DOM element
 * @param {Element} element - DOM element to check
 * @returns {string|null} - Context type or null
 */
export const detectZIndexContext = (element) => {
  if (!element) return null;
  
  const modalParent = element.closest('[data-modal-level]');
  if (modalParent) {
    const level = modalParent.getAttribute('data-modal-level');
    return level === '2' ? 'nested-modal' : 'modal';
  }
  return null;
};

/**
 * Get context-aware z-index value
 * @param {string} baseLayer - Base layer name from Z_INDEX_LAYERS
 * @param {string|null} context - Context type ('modal', 'nested-modal', or null)
 * @returns {number} - Calculated z-index value
 */
export const getContextualZIndex = (baseLayer, context = null) => {
  const baseValue = GENERATED_Z_INDEXES[baseLayer];
  
  if (!baseValue) {
    console.warn(`Unknown z-index layer: ${baseLayer}`);
    return 1000; // Fallback
  }
  
  if (!context) return baseValue;
  
  // If inside modal, use modal's z-index + offset
  if (context === 'modal') {
    return GENERATED_Z_INDEXES.modal + 50;
  }
  
  // If inside nested modal, use nested modal's z-index + offset
  if (context === 'nested-modal') {
    return GENERATED_Z_INDEXES['nested-modal'] + 50;
  }
  
  return baseValue;
};

/**
 * Calculate z-index at runtime based on DOM context
 * @param {string} baseLayer - Base layer name
 * @param {Element} element - DOM element to check context for
 * @returns {number} - Calculated z-index value
 */
export const calculateZIndex = (baseLayer, element) => {
  const context = detectZIndexContext(element);
  return getContextualZIndex(baseLayer, context);
};

/**
 * Detect parent z-index from DOM element
 * @param {Element} element - DOM element to check
 * @returns {number} - Parent z-index value or 0 if not found
 */
export const detectParentZIndex = (element) => {
  if (!element) return 0;
  
  // First, check for CSS custom property --parent-z-index
  const parentVar = getComputedStyle(element).getPropertyValue('--parent-z-index');
  if (parentVar && parentVar.trim()) {
    const parsed = parseInt(parentVar.trim());
    if (!isNaN(parsed)) return parsed;
  }
  
  // Fallback: traverse DOM to find parent with z-index
  let parent = element.parentElement;
  while (parent && parent !== document.body) {
    const computedStyle = getComputedStyle(parent);
    const zIndex = parseInt(computedStyle.zIndex);
    
    // Only consider positive z-index values
    if (!isNaN(zIndex) && zIndex > 0) {
      return zIndex;
    }
    
    parent = parent.parentElement;
  }
  
  return 0;
};

/**
 * Get child z-index by auto-incrementing from parent
 * @param {Element} element - DOM element to check parent context
 * @param {number} offset - Offset to add to parent z-index (default: 1)
 * @returns {number} - Child z-index value
 */
export const getChildZIndex = (element, offset = 1) => {
  const parentZIndex = detectParentZIndex(element);
  
  // If no parent z-index found, return a reasonable default
  if (parentZIndex === 0) {
    return Z_INDEX.DROPDOWN; // Fallback to default dropdown z-index
  }
  
  return parentZIndex + offset;
};

/**
 * Set parent z-index as CSS custom property on element
 * @param {Element} element - DOM element to set property on
 * @param {number} zIndex - Z-index value to set
 */
export const setParentZIndex = (element, zIndex) => {
  if (element && element.style) {
    element.style.setProperty('--parent-z-index', zIndex.toString());
  }
};

/**
 * Inject z-index CSS custom properties into document root
 * Call this function once during app initialization
 */
export const injectZIndexCSSVars = () => {
  const styleString = Object.entries(Z_INDEX_CSS_VARS)
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
  
  document.documentElement.style.cssText += styleString;
  
  console.log('🎨 Z-Index CSS variables injected:', Z_INDEX_CSS_VARS);
};

/**
 * Debug helper to log current z-index configuration
 */
export const debugZIndex = () => {
  console.group('🔍 Z-Index Configuration');
  console.log('Layers (bottom to top):', Z_INDEX_LAYERS);
  console.log('Generated values:', GENERATED_Z_INDEXES);
  console.log('JavaScript constants:', Z_INDEX);
  console.log('CSS custom properties:', Z_INDEX_CSS_VARS);
  console.groupEnd();
};

// Auto-inject CSS variables when this module is imported
if (typeof document !== 'undefined') {
  // Delay injection to ensure DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectZIndexCSSVars);
  } else {
    injectZIndexCSSVars();
  }
}

/**
 * Enhanced debug helper with parent z-index detection
 */
export const debugZIndexForElement = (element, label = 'Element') => {
  if (!element) {
    console.warn(`[Z-Index Debug] ${label}: Element is null/undefined`);
    return;
  }
  
  const computedStyle = getComputedStyle(element);
  const elementZIndex = parseInt(computedStyle.zIndex);
  const parentZIndex = detectParentZIndex(element);
  const parentVar = computedStyle.getPropertyValue('--parent-z-index');
  
  console.group(`🔍 Z-Index Debug: ${label}`);
  console.log('Element z-index:', isNaN(elementZIndex) ? 'auto' : elementZIndex);
  console.log('Parent z-index (detected):', parentZIndex);
  console.log('--parent-z-index CSS var:', parentVar || 'not set');
  console.log('Suggested child z-index:', getChildZIndex(element));
  console.log('Element:', element);
  console.groupEnd();
};