import * as tuyenDuongDataService from '@services/mockData/tuyenDuong';
import { 
  mockApiCall, 
  withPagination, 
  withSingleItem, 
  withCreate, 
  withUpdate, 
  withDelete,
  ERROR_CODES 
} from './apiWrapper.js';

export const getAllTuyenDuong = async (page = 1, limit = 10) => {
  return mockApiCall(
    withPagination(() => tuyenDuongDataService.getAllTuyenDuong(), page, limit),
    'TuyenDuong'
  );
};

export const getTuyenDuongById = async id => {
  return mockApiCall(
    withSingleItem(() => tuyenDuongDataService.getTuyenDuongById(id), ERROR_CODES.NOT_FOUND, 'Tuyến đường không tồn tại'),
    'TuyenDuong'
  );
};

export const getTuyenDuongByMaSo = async ma_so => {
  return mockApiCall(
    withSingleItem(() => tuyenDuongDataService.getTuyenDuongByMaSo(ma_so), ERROR_CODES.NOT_FOUND, 'Tuyến đường không tồn tại'),
    'TuyenDuong'
  );
};

export const createTuyenDuong = async tuyenDuong => {
  return mockApiCall(
    withCreate(() => tuyenDuongDataService.createTuyenDuong(tuyenDuong)),
    'TuyenDuong'
  );
};

export const updateTuyenDuong = async (id, updates) => {
  return mockApiCall(
    withUpdate(() => tuyenDuongDataService.updateTuyenDuong(id, updates), ERROR_CODES.NOT_FOUND, 'Tuyến đường không tồn tại'),
    'TuyenDuong'
  );
};

export const deleteTuyenDuong = async id => {
  return mockApiCall(
    withDelete(() => tuyenDuongDataService.deleteTuyenDuong(id), ERROR_CODES.NOT_FOUND, 'Tuyến đường không tồn tại'),
    'TuyenDuong'
  );
};

// For testing and resetting
export const _resetTuyenDuong = async (newData = []) => {
  return mockApiCall(
    () => tuyenDuongDataService._resetTuyenDuong(newData),
    'TuyenDuong'
  );
};

export const getTuyenDuongCount = async () => {
  return mockApiCall(
    withSingleItem(() => tuyenDuongDataService.getTuyenDuongCount(), ERROR_CODES.NOT_FOUND, 'Không thể lấy số lượng tuyến đường'),
    'TuyenDuong'
  );
};
