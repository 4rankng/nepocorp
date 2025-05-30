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

    const allData = await dataFetcher();
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
    throw createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch data', error.message);
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
    const data = await dataFetcher();

    if (!data) {
      throw createApiErrorResponse(ErrorCodes.NOT_FOUND, notFoundMessage);
    }

    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    if (error.success === false) {
      // Already an API error response
      throw error;
    }
    throw createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch item', error.message);
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
    const data = await creator();

    if (!data) {
      throw createApiErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Failed to create item - invalid data provided'
      );
    }

    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    if (error.success === false) {
      throw error;
    }
    throw createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to create item', error.message);
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
    const data = await updater();

    if (!data) {
      throw createApiErrorResponse(ErrorCodes.NOT_FOUND, notFoundMessage);
    }

    return createApiSingleResponse(data, successMessage);
  } catch (error) {
    if (error.success === false) {
      throw error;
    }
    throw createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to update item', error.message);
  }
}

/**
 * Wraps a function to handle delete operations
 * @param {Function} deleter - Function that performs deletion and returns boolean
 * @param {string} [notFoundMessage='Item not found'] - Message when item is not found
 * @param {string} [successMessage='Item deleted successfully'] - Success message
 * @returns {Promise<ApiSingleResponse<{deleted: boolean}>>}
 */
export async function withDelete(
  deleter,
  notFoundMessage = 'Item not found',
  successMessage = 'Item deleted successfully'
) {
  try {
    const success = await deleter();

    if (!success) {
      throw createApiErrorResponse(ErrorCodes.NOT_FOUND, notFoundMessage);
    }

    return createApiSingleResponse({ deleted: true }, successMessage);
  } catch (error) {
    if (error.success === false) {
      throw error;
    }
    throw createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to delete item', error.message);
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
 * @param {boolean} [options.throwOnError=true] - Whether to throw errors or return them
 * @returns {Promise<T>}
 */
export async function mockApiCall(apiCall, options = {}) {
  const { delay = 0, throwOnError = true } = options;

  try {
    if (delay > 0) {
      await simulateDelay(delay);
    }

    return await apiCall();
  } catch (error) {
    const errorResponse =
      error.success === false
        ? error
        : createApiErrorResponse(ErrorCodes.INTERNAL_ERROR, 'API call failed', error.message);

    if (throwOnError) {
      throw errorResponse;
    }

    return errorResponse;
  }
}
