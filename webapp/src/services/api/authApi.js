import apiClient from './apiClient';

export const authApi = {
  // Login user
  login: async (username, password) => {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
    });

    // Store tokens ONLY if login successful
    if (response.status === 'success' && response.data?.token) {
      window.localStorage.setItem('authToken', response.data.token);
      if (response.data.refresh_token) {
        window.localStorage.setItem('refreshToken', response.data.refresh_token);
      }
    }

    return response;
  },

  // Refresh token
  refreshToken: async () => {
    const refreshToken = window.localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }

    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });

    if (response.token) {
      window.localStorage.setItem('authToken', response.token);
      if (response.refresh_token) {
        window.localStorage.setItem('refreshToken', response.refresh_token);
      }
    }

    return response;
  },

  // Get user profile
  getProfile: async () => {
    const response = await apiClient.get('/auth/profile');
    return response;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.put('/auth/profile/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response;
  },

  // Update user profile
  updateProfile: async profileData => {
    const response = await apiClient.put('/auth/profile', profileData);
    return response;
  },

  // Logout user
  logout: async () => {
    window.localStorage.removeItem('authToken');
    window.localStorage.removeItem('refreshToken');
    window.localStorage.removeItem('auth');
    return { status: 'success' };
  },
};
