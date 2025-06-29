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
  acc[`--z-index-${layer}`] = GENERATED_Z_INDEXES[layer];
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