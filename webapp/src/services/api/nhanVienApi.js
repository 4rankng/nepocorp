import apiClient from './apiClient';

export const nhanVienApi = {
  // Get all employees with pagination
  getAll: async (page = 1, pageSize = 10) => {
    const response = await apiClient.get(`/nhan-vien?page=${page}&pageSize=${pageSize}`);
    return response;
  },

  // Get employee by ID
  getById: async (id) => {
    const response = await apiClient.get(`/nhan-vien/${id}`);
    return response;
  },

  // Create new employee
  create: async (data) => {
    const response = await apiClient.post('/nhan-vien', data);
    return response;
  },

  // Update existing employee
  update: async (id, data) => {
    const response = await apiClient.put(`/nhan-vien/${id}`, data);
    return response;
  },

  // Delete employee
  delete: async (id) => {
    const response = await apiClient.delete(`/nhan-vien/${id}`);
    return response;
  }
};

// Alias functions for compatibility with hook expectations
export const fetchAllNhanVien = nhanVienApi.getAll;
export const addNhanVien = nhanVienApi.create;
export const editNhanVien = nhanVienApi.update;
export const removeNhanVien = nhanVienApi.delete;