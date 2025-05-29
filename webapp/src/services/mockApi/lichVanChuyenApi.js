// Mock API services for LichVanChuyen (Transport Schedules)
import * as lichVanChuyenDataService from '@services/mockData/lichVanChuyen';
const SIMULATED_DELAY = 0; // ms - No delay, can be adjusted
const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (LichVanChuyen):', error.message); // Log error message
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};
// All data now uses the new schema: ma_chuyen, ngay_di, etc.
export const fetchAllLichVanChuyen = () => {
  return simulateApiCall(lichVanChuyenDataService.getAllLichVanChuyen);
};
export const fetchLichVanChuyenById = id => {
  return simulateApiCall(() => lichVanChuyenDataService.getLichVanChuyenById(id));
};
export const fetchLichVanChuyenByMaChuyenXe = maChuyenXe => {
  return simulateApiCall(() => lichVanChuyenDataService.getLichVanChuyenByMaChuyenXe(maChuyenXe));
};
export const addLichVanChuyen = data => {
  return simulateApiCall(() => lichVanChuyenDataService.createLichVanChuyen(data));
};
export const editLichVanChuyen = (id, data) => {
  return simulateApiCall(() => lichVanChuyenDataService.updateLichVanChuyen(id, data));
};
export const removeLichVanChuyen = id => {
  return simulateApiCall(() => lichVanChuyenDataService.deleteLichVanChuyen(id));
};
export const _resetLichVanChuyenMockData = data => {
  return simulateApiCall(() => lichVanChuyenDataService._resetLichVanChuyen(data));
};
