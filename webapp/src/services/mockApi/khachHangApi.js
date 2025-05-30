// Mock API services for KhachHang (Customers)
import * as khachHangDataService from '@services/mockData/khachHang';
import {
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  createApiSingleResponse,
  mockApiCall,
} from './apiWrapper.js';

export const fetchAllKhachHang = (page = 1, limit = 50) => {
  return mockApiCall(() =>
    withPagination(() => khachHangDataService.getAllKhachHang(), { page, limit })
  );
};

export const fetchKhachHangById = id => {
  return mockApiCall(() =>
    withSingleItem(() => khachHangDataService.getKhachHangById(id), 'Khach hang not found')
  );
};

export const addKhachHang = data => {
  return mockApiCall(() =>
    withCreate(() => khachHangDataService.createKhachHang(data), 'Khach hang created successfully')
  );
};

export const editKhachHang = (id, data) => {
  return mockApiCall(() =>
    withUpdate(
      () => khachHangDataService.updateKhachHang(id, data),
      'Khach hang not found',
      'Khach hang updated successfully'
    )
  );
};

export const removeKhachHang = id => {
  return mockApiCall(() =>
    withDelete(
      () => khachHangDataService.deleteKhachHang(id),
      'Khach hang not found',
      'Khach hang deleted successfully'
    )
  );
};

export const _resetKhachHangMockData = data => {
  return mockApiCall(() =>
    createApiSingleResponse(
      khachHangDataService._resetKhachHang(data),
      'Khach hang data reset successfully'
    )
  );
};
