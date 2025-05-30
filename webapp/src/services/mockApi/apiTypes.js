/**
 * API Response Type Definitions
 * Standardized response formats for all API endpoints
 */

/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {T[]} data - Array of data items
 * @property {Object} meta - Pagination metadata
 * @property {number} meta.count - Number of records in current response
 * @property {number} meta.offset - Starting position (0-based indexing)
 * @property {number} meta.limit - Maximum records per page
 * @property {number} meta.page - Current page (1-based)
 * @property {number} meta.totalPages - Total number of pages
 * @property {string} [message] - Optional message
 * @property {boolean} success - Success status
 */

/**
 * @template T
 * @typedef {Object} ApiSingleResponse
 * @property {T} data - Single data object
 * @property {string} [message] - Optional message
 * @property {boolean} success - Success status
 */

/**
 * @typedef {Object} ApiErrorResponse
 * @property {Object} error - Error details
 * @property {string} error.code - Error code
 * @property {string} error.message - Error message
 * @property {any} [error.details] - Optional error details
 * @property {false} success - Always false for errors
 * @property {string} timestamp - Error timestamp (ISO format)
 */

// Export types for JSDoc usage
export const ApiResponseTypes = {};
