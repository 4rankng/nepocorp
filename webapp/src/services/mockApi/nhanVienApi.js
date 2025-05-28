// Mock API services for NhanVien (Employees)
import * as nhanVienDataService from '@services/mockData/nhanVien';

const SIMULATED_DELAY = 0; // ms - No delay

const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (NhanVien):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllNhanVien = () => {
  return simulateApiCall(nhanVienDataService.getAllNhanVien);
};

export const fetchNhanVienById = id => {
  return simulateApiCall(() => nhanVienDataService.getNhanVienById(id));
};

export const addNhanVien = data => {
  return simulateApiCall(() => nhanVienDataService.createNhanVien(data));
};

export const editNhanVien = (id, data) => {
  return simulateApiCall(() => nhanVienDataService.updateNhanVien(id, data));
};

export const removeNhanVien = id => {
  return simulateApiCall(() => nhanVienDataService.deleteNhanVien(id));
};

export const _resetNhanVienMockData = data => {
  return simulateApiCall(() => nhanVienDataService._resetNhanVien(data));
};
