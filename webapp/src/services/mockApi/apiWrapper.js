/**
 * Mock API Response Wrapper
 * Provides standardized response formats for all mock API endpoints
 */
/**
 * Error codes used throughout the application
 */
export const ErrorCodes = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
};
/**
 * Creates a standardized paginated API response
 * @template T
 * @param {T[]} data - Array of data items
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Current page (1-based)
 * @param {number} [options.limit=10] - Items per page
 * @param {number} [options.totalItems] - Total number of items (if different from data.length)
 * @param {string} [options.message] - Optional message
 * @returns {ApiResponse<T>}
 */
export function createApiResponse(data, options = {}) {
  const { page = 1, limit = 10, totalItems = data.length, message } = options;
  const count = data.length;
  const offset = (page - 1) * limit;
  const totalPages = Math.ceil(totalItems / limit);
  return {
    data,
    meta: {
      count,
      offset,
      limit,
      page,
      totalPages,
    },
    ...(message && { message }),
    success: true,
  };
}
/**
 * Creates a standardized single item API response
 * @template T
 * @param {T} data - Single data object
 * @param {string} [message] - Optional message
 * @returns {ApiSingleResponse<T>}
 */
export function createApiSingleResponse(data, message) {
  return {
    data,
    ...(message && { message }),
    success: true,
  };
}
/**
 * Creates a standardized error response
 * @param {string} code - Error code from ErrorCodes
 * @param {string} message - Error message
 * @param {any} [details] - Optional error details
 * @returns {ApiErrorResponse}
 */
export function createApiErrorResponse(code, message, details) {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
    success: false,
    timestamp: new Date().toISOString(),
  };
}
/**
 * Wraps a function to handle pagination automatically
 * @template T
 * @param {Function} dataFetcher - Function that returns array of data
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Current page
 * @param {number} [options.limit=10] - Items per page
 * @param {string} [options.message] - Optional message
 * @returns {Promise<ApiResponse<T>>}
 */
export async function withPagination(dataFetcher, options = {}) {
  try {
    const { page = 1, limit = 10, message } = options;
    let allData;
    try {
      allData = await dataFetcher();
    } catch (fetchError) {
      console.warn('Data fetcher error in pagination:', fetchError);
      return createApiErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch data for pagination',
        fetchError.message
      );
    }
    if (!allData || !Array.isArray(allData)) {
      console.warn('Invalid data returned for pagination:', allData);
      return createApiErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Invalid data format for pagination'
      );
    }
    const totalItems = allData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allData.slice(startIndex, endIndex);
    return createApiResponse(paginatedData, {
      page,
      limit,
      totalItems,
      message,
    });
  } catch (error) {
    console.error('Pagination wrapper error:', error);
    return createApiErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to process pagination',
      error.message
    );
  }
}
/**
 * Wraps a function to handle single item responses
 * @template T
 * @param {Function} dataFetcher - Function that returns single item or null
 * @param {string} [notFoundMessage='Item not found'] - Message when item is not found
 * @param {string} [successMessage] - Optional success message
 * @returns {Promise<ApiSingleResponse<T>>}
 */
export async function withSingleItem(
  dataFetcher,
  notFoundMessage = 'Item not found',
  successMessage
) {
  try {
    let data;
    try {
      data = await dataFetcher();
    } catch (fetchError) {
      console.warn('Data fetcher error in single item:', fetchError);
      return createApiErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch item data',
        fetchError.message
      );
    }
    if (!data) {
      return createApiErrorResponse(ErrorCodes.NOT_FOUND, notFoundMessage);
    }
    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    console.error('Single item wrapper error:', error);
    if (error.success === false) {
      // Already an API error response
      return error;
    }
    return createApiErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to process item',
      error.message
    );
  }
}
/**
 * Wraps a function to handle creation operations
 * @template T
 * @param {Function} creator - Function that creates and returns new item
 * @param {string} [successMessage='Item created successfully'] - Success message
 * @returns {Promise<ApiSingleResponse<T>>}
 */
export async function withCreate(creator, successMessage = 'Item created successfully') {
  try {
    let data;
    try {
      data = await creator();
    } catch (createError) {
      console.warn('Creator function error:', createError);
      return createApiErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to execute create operation',
        createError.message
      );
    }
    if (!data) {
      return createApiErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Failed to create item - invalid data provided'
      );
    }
    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    console.error('Create wrapper error:', error);
    if (error.success === false) {
      return error;
    }
    return createApiErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to create item',
      error.message
    );
  }
}
/**
 * Wraps a function to handle update operations
 * @template T
 * @param {Function} updater - Function that updates and returns updated item
 * @param {string} [notFoundMessage='Item not found'] - Message when item is not found
 * @param {string} [successMessage='Item updated successfully'] - Success message
 * @returns {Promise<ApiSingleResponse<T>>}
 */
export async function withUpdate(
  updater,
  notFoundMessage = 'Item not found',
  successMessage = 'Item updated successfully'
) {
  try {
    let data;
    try {
      data = await updater();
    } catch (updateError) {
      console.warn('Updater function error:', updateError);
      return createApiErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to execute update operation',
        updateError.message
      );
    }
    if (!data) {
      return createApiErrorResponse(ErrorCodes.NOT_FOUND, notFoundMessage);
    }
    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    console.error('Update wrapper error:', error);
    if (error.success === false) {
      return error;
    }
    return createApiErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to update item',
      error.message
    );
  }
}
/**
 * Wraps a function to handle delete operations
 * @template T
 * @param {Function} deleter - Function that deletes and returns deleted item or success indicator
 * @param {string} [notFoundMessage='Item not found'] - Message when item is not found
 * @param {string} [successMessage='Item deleted successfully'] - Success message
 * @returns {Promise<ApiSingleResponse<T>>}
 */
export async function withDelete(
  deleter,
  notFoundMessage = 'Item not found',
  successMessage = 'Item deleted successfully'
) {
  try {
    let result;
    try {
      result = await deleter();
    } catch (deleteError) {
      console.warn('Deleter function error:', deleteError);
      return createApiErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to execute delete operation',
        deleteError.message
      );
    }
    // Some delete operations might return the deleted item, others true/false
    // In case false is returned, treat as not found
    if (result === false) {
      return createApiErrorResponse(ErrorCodes.NOT_FOUND, notFoundMessage);
    }
    // For delete operations that return the deleted item
    const data = result === true ? { deleted: true } : result;
    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    console.error('Delete wrapper error:', error);
    if (error.success === false) {
      return error;
    }
    return createApiErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to delete item',
      error.message
    );
  }
}
/**
 * Simulates API delay for development/testing
 * @param {number} delay - Delay in milliseconds
 * @returns {Promise<void>}
 */
export function simulateDelay(delay = 100) {
  return new Promise(resolve => setTimeout(resolve, delay));
}
/**
 * Generic API call wrapper that handles errors and provides consistent response format
 * @template T
 * @param {Function} apiCall - The API call function
 * @param {Object} [options] - Options
 * @param {number} [options.delay=0] - Simulated delay in ms
 * @returns {Promise<T>}
 */
export async function mockApiCall(apiCall, options = {}) {
  const { delay = 0 } = options;
  try {
    if (delay > 0) {
      await simulateDelay(delay);
    }
    // Safely execute the API call and capture any errors
    let result;
    try {
      result = await apiCall();
    } catch (callError) {
      console.warn('API call execution error:', callError);
      // Enhanced error handling to provide more detailed information
      const errorDetails = callError.message || 'Unknown error occurred';
      const errorResponse =
        callError.success === false
          ? callError
          : createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'API call execution failed', {
              message: errorDetails,
              originalError: callError.toString(),
              timestamp: new Date().toISOString(),
            });
      console.error('API error details:', errorResponse);
      return errorResponse;
    }
    // Check if result is valid
    if (!result) {
      console.warn('API call returned empty result');
      return createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'API returned empty result');
    }
    return result;
  } catch (error) {
    // This catches any other errors in the wrapper itself
    console.error('Mock API wrapper error:', error);
    const errorResponse =
      error.success === false
        ? error
        : createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'API call failed', error.message);
    return errorResponse;
  }
}
