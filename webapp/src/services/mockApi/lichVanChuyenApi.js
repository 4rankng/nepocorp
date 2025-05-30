// Mock API services for LichVanChuyen (Transport Schedules)
import * as lichVanChuyenDataService from '@services/mockData/lichVanChuyen';
import {
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  createApiSingleResponse,
  mockApiCall,
} from './apiWrapper.js';

// All data now uses the new schema: ma_chuyen, ngay_di, etc.
export const fetchAllLichVanChuyen = (options = {}) => {
  const { page = 1, limit = 50 } = typeof options === 'object' ? options : {};
  return mockApiCall(() =>
    withPagination(() => lichVanChuyenDataService.getAllLichVanChuyen(), { page, limit })
  );
};

export const fetchLichVanChuyenById = id => {
  return mockApiCall(() =>
    withSingleItem(
      () => lichVanChuyenDataService.getLichVanChuyenById(id),
      'Lich van chuyen not found'
    )
  );
};

export const fetchLichVanChuyenByMaChuyenXe = maChuyenXe => {
  return mockApiCall(() =>
    withSingleItem(
      () => lichVanChuyenDataService.getLichVanChuyenByMaChuyenXe(maChuyenXe),
      'Lich van chuyen not found'
    )
  );
};

export const addLichVanChuyen = data => {
  return mockApiCall(() =>
    withCreate(
      () => lichVanChuyenDataService.createLichVanChuyen(data),
      'Lich van chuyen created successfully'
    )
  );
};

export const editLichVanChuyen = (id, data) => {
  return mockApiCall(() =>
    withUpdate(
      () => lichVanChuyenDataService.updateLichVanChuyen(id, data),
      'Lich van chuyen not found',
      'Lich van chuyen updated successfully'
    )
  );
};

export const removeLichVanChuyen = id => {
  return mockApiCall(() =>
    withDelete(
      () => lichVanChuyenDataService.deleteLichVanChuyen(id),
      'Lich van chuyen not found',
      'Lich van chuyen deleted successfully'
    )
  );
};

export const _resetLichVanChuyenMockData = data => {
  return mockApiCall(() =>
    createApiSingleResponse(
      lichVanChuyenDataService._resetLichVanChuyen(data),
      'Lich van chuyen data reset successfully'
    )
  );
};
