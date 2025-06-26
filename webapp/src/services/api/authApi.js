import apiClient from './apiClient';

export const authApi = {
  // Login user
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password
    });
    
    // Store tokens ONLY if login successful
    if (response.status === 'success' && response.token) {
      localStorage.setItem('authToken', response.token);
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token);
      }
    }
    
    return response;
  },
  
  // Refresh token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }
    
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken
    });
    
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      if (response.refresh_token) {
        localStorage.setItem('refreshToken', response.refresh_token);
      }
    }
    
    return response;
  },
  
  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response;
  },
  
  // Logout user
  logout: async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth');
    return { status: 'success' };
  }
};