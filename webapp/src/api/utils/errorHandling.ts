import { ApiError, ApiErrorCode } from '@api/types';

export class ApiErrorHandler {
  static getErrorMessage(error: unknown): string {
    if (this.isApiError(error)) {
      return error.message || 'An error occurred';
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'An unexpected error occurred';
  }

  static getErrorCode(error: unknown): number | undefined {
    if (this.isApiError(error)) {
      return error.errors?.code;
    }
    return undefined;
  }

  static isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      (error as any).status === 'error'
    );
  }

  static isBadRequest(error: unknown): boolean {
    return this.getErrorCode(error) === ApiErrorCode.BAD_REQUEST;
  }

  static isNotFound(error: unknown): boolean {
    return this.getErrorCode(error) === ApiErrorCode.NOT_FOUND;
  }

  static isUnauthorized(error: unknown): boolean {
    return this.getErrorCode(error) === ApiErrorCode.UNAUTHORIZED;
  }

  static isServerError(error: unknown): boolean {
    const code = this.getErrorCode(error);
    return code !== undefined && code >= 5000;
  }

  static getDisplayMessage(error: unknown): string {
    if (this.isUnauthorized(error)) {
      return 'You are not authorized to perform this action. Please log in again.';
    }
    
    if (this.isNotFound(error)) {
      return 'The requested resource was not found.';
    }
    
    if (this.isBadRequest(error)) {
      return this.getErrorMessage(error);
    }
    
    if (this.isServerError(error)) {
      return 'A server error occurred. Please try again later.';
    }
    
    return this.getErrorMessage(error);
  }

  static logError(error: unknown, context?: string): void {
    const errorMessage = this.getErrorMessage(error);
    const errorCode = this.getErrorCode(error);
    
    console.error(`API Error${context ? ` (${context})` : ''}:`, {
      message: errorMessage,
      code: errorCode,
      error
    });
  }
}

// React Query error boundary handler
export const handleQueryError = (error: unknown, context?: string) => {
  ApiErrorHandler.logError(error, context);
  
  // You can extend this to show toast notifications, send to error tracking, etc.
  // For now, just log the error
};

// Utility function for consistent error handling in components
export const useErrorHandler = () => {
  return {
    getErrorMessage: ApiErrorHandler.getDisplayMessage,
    logError: ApiErrorHandler.logError,
    isUnauthorized: ApiErrorHandler.isUnauthorized,
    isServerError: ApiErrorHandler.isServerError,
  };
};