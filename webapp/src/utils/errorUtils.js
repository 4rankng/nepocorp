/**
 * Utility functions for handling API error responses
 */

/**
 * Extracts a comprehensive error message from an API error response
 * Combines both message and errors.message when available
 *
 * @param {Object} error - The error object from the API
 * @param {string} fallbackMessage - Default message if no error details found
 * @returns {string} The formatted error message
 */
export const extractErrorMessage = (error, fallbackMessage = 'Đã xảy ra lỗi') => {
  // Handle different error structures
  const response = error?.response?.data || error?.response || error;

  // Case 1: Both main message and detailed error message exist
  if (response?.message && response?.errors?.message) {
    return `${response.message}: ${response.errors.message}`;
  }

  // Case 2: Only main message exists
  if (response?.message) {
    return response.message;
  }

  // Case 3: Only detailed error message exists
  if (response?.errors?.message) {
    return response.errors.message;
  }

  // Case 4: Legacy error format
  if (response?.error?.message) {
    return response.error.message;
  }

  // Case 5: Plain error message
  if (error?.message) {
    return error.message;
  }

  // Case 6: Fallback
  return fallbackMessage;
};

/**
 * Checks if an error is a validation error
 *
 * @param {Object} error - The error object from the API
 * @returns {boolean} True if it's a validation error
 */
export const isValidationError = error => {
  const response = error?.response?.data || error?.response || error;
  return (
    response?.error?.code === 'VALIDATION_ERROR' ||
    response?.errors?.code === 4001 ||
    error?.validationError === true
  );
};

/**
 * Extracts validation error details for form field errors
 *
 * @param {Object} error - The error object from the API
 * @returns {Object} Object with field-specific error messages
 */
export const extractValidationErrors = error => {
  const response = error?.response?.data || error?.response || error;
  return response?.error?.details || response?.errors?.details || {};
};

/**
 * Creates a standardized error object for consistent error handling
 *
 * @param {Object} originalError - The original error from the API
 * @param {string} fallbackMessage - Default message if no error details found
 * @returns {Object} Standardized error object
 */
export const createStandardError = (originalError, fallbackMessage = 'Đã xảy ra lỗi') => {
  const message = extractErrorMessage(originalError, fallbackMessage);
  const validationError = isValidationError(originalError);
  const validationDetails = validationError ? extractValidationErrors(originalError) : {};

  const error = new Error(message);
  error.response = originalError?.response;
  error.validationError = validationError;
  error.validationDetails = validationDetails;

  return error;
};
