import apiClient from './apiClient';

export const healthApi = {
  /**
   * Check the health status of the backend service
   * @returns {Promise} Promise with health status data
   */
  getHealthStatus: async () => {
    try {
      // Health check endpoint doesn't require authentication
      const response = await apiClient.get('/healthz');
      return {
        status: 'healthy',
        data: response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  },
};

export default healthApi;
