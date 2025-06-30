import apiClient from './apiClient';

export const settingsApi = {
  /**
   * Get setting by key
   * @param {string} key - The setting key (e.g., 'tax_rate')
   * @returns {Promise} Promise with setting data
   */
  getSetting: async key => {
    const response = await apiClient.get(`/settings/${key}`);
    return response;
  },

  /**
   * Update setting by key
   * @param {string} key - The setting key (e.g., 'tax_rate')
   * @param {string} value - The new value
   * @returns {Promise} Promise with updated setting data
   */
  updateSetting: async (key, value) => {
    const response = await apiClient.put(`/settings/${key}`, { value });
    return response;
  },

  /**
   * Get tax rate setting
   * @returns {Promise} Promise with tax rate data
   */
  getTaxRate: async () => {
    return settingsApi.getSetting('tax_rate');
  },

  /**
   * Update tax rate setting
   * @param {string} value - The new tax rate value
   * @returns {Promise} Promise with updated tax rate data
   */
  updateTaxRate: async value => {
    return settingsApi.updateSetting('tax_rate', value);
  },
};

export default settingsApi;
