import { useState, useCallback, useEffect } from 'react';
import { extractErrorMessage, isValidationError } from '@utils/errorUtils';
import logger from '@services/logger';

export default function useExpenseForm({
  initialFormData,
  onSuccess,
  onError,
  fetchData,
  isEdit,
  api,
  expenseCategoryId = null, // Fixed category (like BaoDuong = 1)
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Update formData when initialFormData changes (for edit mode)
  useEffect(() => {
    setFormData(initialFormData);
    setErrors({}); // Clear errors when switching between add/edit
  }, [initialFormData]);

  const handleInputChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field - use functional update to avoid stale closures
    setErrors(prev => {
      if (prev[name]) {
        return { ...prev, [name]: '' };
      }
      return prev;
    });
  }, []);

  const validateForm = useCallback(() => {
    // This function is kept for backward compatibility but validation
    // is now handled by ExpenseForm.jsx before calling handleSave
    setErrors({});
    return true;
  }, []);

  const handleSave = useCallback(
    async (e, currentPage = 0, pageSize = 10, preparedData = null) => {
      e?.preventDefault();

      try {
        setIsLoading(true);

        // Use prepared data if provided, otherwise fall back to formData
        const dataToSave = preparedData || formData;

        // Call the appropriate API method directly with the prepared data
        let response;
        if (isEdit) {
          response = await api.update(dataToSave.id, dataToSave);

          // Check for API error responses
          if (response?.status !== 'success') {
            const errorMessage = extractErrorMessage(response, 'Sửa thất bại');
            const error = new Error(errorMessage);
            error.response = response;
            error.validationError = isValidationError(response);
            throw error;
          }

          onSuccess?.(response?.message || 'Sửa chi phí thành công');
        } else {
          response = await api.create(dataToSave);

          // Check for API error responses
          if (response?.status !== 'success') {
            const errorMessage = extractErrorMessage(response, 'Thêm thất bại');
            const error = new Error(errorMessage);
            error.response = response;
            error.validationError = isValidationError(response);
            throw error;
          }

          onSuccess?.(response?.message || 'Thêm chi phí thành công');
        }

        // Refresh data if fetchData is provided
        if (fetchData) {
          try {
            await fetchData(currentPage, pageSize);
          } catch (error) {
            logger.error('Error refreshing data', { error });
            // Try fallback to first page
            try {
              await fetchData(0, pageSize);
            } catch (fallbackError) {
              logger.error('Fallback error', { error: fallbackError });
              throw fallbackError;
            }
          }
        }

        return response;
      } catch (error) {
        // Extract and format error message from API response
        let errorMessage = 'Đã xảy ra lỗi khi lưu dữ liệu';

        // Handle new backend error format: message + errors.message
        if (error?.response?.message && error?.response?.errors?.message) {
          errorMessage = `${error.response.message}: ${error.response.errors.message}`;
        } else if (error?.response?.message) {
          errorMessage = error.response.message;
        } else if (error?.response?.error?.message) {
          errorMessage = error.response.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.response?.data?.message) {
          errorMessage = error.response.data.message;
        }

        // Update form errors if available in the API response
        if (error?.response?.data?.errors) {
          setErrors(error.response.data.errors);
        } else if (error?.response?.error?.details) {
          // Handle validation errors from API
          const apiErrors = {};
          Object.entries(error.response.error.details).forEach(([field, message]) => {
            apiErrors[field] = Array.isArray(message) ? message[0] : message;
          });
          setErrors(apiErrors);
        }

        // Call onError if provided
        if (onError) {
          onError({
            ...error,
            message: errorMessage,
            isValidationError: error.validationError === true,
          });
        }

        // Don't re-throw validation errors since they're already handled
        if (!error.validationError) {
          // Re-throw the error with additional context
          const enhancedError = new Error(errorMessage);
          enhancedError.originalError = error;
          enhancedError.isValidationError = error.validationError === true;
          throw enhancedError;
        }
      } finally {
        setIsLoading(false);
      }
    },
    [formData, expenseCategoryId, isEdit, api, fetchData, onSuccess, onError]
  );

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    isLoading,
    setIsLoading,
    handleInputChange,
    validateForm,
    handleSave,
  };
}
