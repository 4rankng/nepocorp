import apiClient from './apiClient';

export const authApi = {
  // Login user
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password
    });
    
    // Store token if login successful
    if (response.token) {
      localStorage.setItem('authToken', response.token);
    }
    
    return response;
  },
  
  // Logout user
  logout: async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('auth');
    return { status: 'success' };
  },
  
  // Verify token validity
  verifyToken: async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new Error('No token found');
    }
    
    // This endpoint would need to be implemented on backend
    // For now, just check if token exists
    return { valid: true };
  }
};