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
export const fetchAllNhanVien = (page = 1, pageSize = 10) => {
  return simulateApiCall(async () => {
    // Reset to original data before fetching to ensure consistency for this diagnostic step
    await nhanVienDataService._resetNhanVien(); 
    const allNhanVien = await nhanVienDataService.getAllNhanVien();
    const total = allNhanVien.length;
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    const items = allNhanVien.slice(start, end);
    return { items, total };
  });
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
