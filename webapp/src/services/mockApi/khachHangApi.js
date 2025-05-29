// Mock API services for KhachHang (Customers)
import * as khachHangDataService from '@services/mockData/khachHang';

const SIMULATED_DELAY = 0; // ms

const simulateApiCall = fn => {
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
  return simulateApiCall(async () => {
    const allCustomers = await khachHangDataService.getAllKhachHang();
    return { data: allCustomers };
  });
};

export const fetchKhachHangById = id => {
  return simulateApiCall(() => khachHangDataService.getKhachHangById(id));
};

export const addKhachHang = data => {
  return simulateApiCall(() => khachHangDataService.createKhachHang(data));
};

export const editKhachHang = (id, data) => {
  return simulateApiCall(() => khachHangDataService.updateKhachHang(id, data));
};

export const removeKhachHang = id => {
  return simulateApiCall(() => khachHangDataService.deleteKhachHang(id));
};

export const _resetKhachHangMockData = data => {
  return simulateApiCall(() => khachHangDataService._resetKhachHang(data));
};
