import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Return the full response data, preserving the backend's status field
    return response.data;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data;
      let errorMessage = 'An error occurred';
      let errorCode = null;
      
      // Handle structured error responses from backend
      if (errorData?.error) {
        errorMessage = errorData.error;
        if (errorData.details?.message) {
          errorMessage = errorData.details.message;
        }
        if (errorData.details?.code) {
          errorCode = errorData.details.code;
        }
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
      
      console.error('API Error:', errorMessage, errorCode ? `(${errorCode})` : '');
      
      if (error.response.status === 401) {
        const isLoginEndpoint = error.config?.url?.includes('/auth/login');
        
        // Only clear auth data if this is NOT a login attempt
        // Login failures should be handled by the login form, not treated as token expiration
        if (!isLoginEndpoint) {
          // Check if this is a genuine token expiration/invalid token that requires logout
          const errorCode = errorData?.details?.code || errorData?.error;
          const shouldLogout = [
            'TOKEN_EXPIRED', 
            'INVALID_TOKEN', 
            'TOKEN_MALFORMED',
            'INVALID_JWT_SIGNATURE',
            'JWT_VERIFICATION_FAILED'
          ].includes(errorCode);
          
          // Also logout if this is an auth endpoint (like /auth/profile) failing
          const isAuthEndpoint = error.config?.url?.includes('/auth/');
          
          if (shouldLogout || isAuthEndpoint) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('auth');
            
            // Only redirect if we're not already on root
            const isCurrentlyOnRoot = window.location.pathname === '/';
            if (!isCurrentlyOnRoot) {
              window.location.href = '/';
            }
          }
          // For other 401s (like missing user context, middleware issues), 
          // don't logout - just let the error bubble up to be handled by the component
        }
      }
      
      // Create enhanced error with additional context
      const enhancedError = new Error(errorMessage);
      enhancedError.code = errorCode;
      enhancedError.originalData = errorData;
      return Promise.reject(enhancedError);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message);
      return Promise.reject(new Error('Network error. Please check your connection.'));
    } else {
      // Something else happened
      console.error('Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default apiClient;