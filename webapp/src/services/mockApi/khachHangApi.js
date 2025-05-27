// Mock API services for KhachHang (Customers)
import * as khachHangDataService from '../mockData/khachHang';

const SIMULATED_DELAY = 0; // ms

const simulateApiCall = (fn) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (KhachHang):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllKhachHang = () => {
  console.log('[Mock API] Fetching all KhachHang...');
  return simulateApiCall(khachHangDataService.getAllKhachHang);
};

export const fetchKhachHangById = (id) => {
  console.log(`[Mock API] Fetching KhachHang by ID: ${id}`);
  return simulateApiCall(() => khachHangDataService.getKhachHangById(id));
};

export const addKhachHang = (data) => {
  console.log('[Mock API] Creating KhachHang:', data);
  return simulateApiCall(() => khachHangDataService.createKhachHang(data));
};

export const editKhachHang = (id, data) => {
  console.log(`[Mock API] Updating KhachHang ID: ${id} with data:`, data);
  return simulateApiCall(() => khachHangDataService.updateKhachHang(id, data));
};

export const removeKhachHang = (id) => {
  console.log(`[Mock API] Deleting KhachHang ID: ${id}`);
  return simulateApiCall(() => khachHangDataService.deleteKhachHang(id));
};

export const _resetKhachHangMockData = (data) => {
  console.log('[Mock API] Resetting KhachHang Data (via API layer)...');
  return simulateApiCall(() => khachHangDataService._resetKhachHang(data));
};

console.log('KhachHang Mock API service loaded and configured.');
