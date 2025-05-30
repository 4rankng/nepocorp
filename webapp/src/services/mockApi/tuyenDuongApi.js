import * as tuyenDuongDataService from '@services/mockData/tuyenDuong';
import {
  mockApiCall,
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  ErrorCodes,
} from './apiWrapper.js';

export const getAllTuyenDuong = async (page = 1, limit = 10) => {
  return mockApiCall(() => withPagination(() => tuyenDuongDataService.getAllTuyenDuong(), {page, limit }));
};

export const getTuyenDuongById = async id => {
  return mockApiCall(
    withSingleItem(
      () => tuyenDuongDataService.getTuyenDuongById(id),
      ErrorCodes.NOT_FOUND,
      'Tuyến đường không tồn tại'
    ),
    'TuyenDuong'
  );
};

export const getTuyenDuongByMaSo = async ma_so => {
  return mockApiCall(
    withSingleItem(
      () => tuyenDuongDataService.getTuyenDuongByMaSo(ma_so),
      ErrorCodes.NOT_FOUND,
      'Tuyến đường không tồn tại'
    ),
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
    withUpdate(
      () => tuyenDuongDataService.updateTuyenDuong(id, updates),
      ErrorCodes.NOT_FOUND,
      'Tuyến đường không tồn tại'
    ),
    'TuyenDuong'
  );
};

export const deleteTuyenDuong = async id => {
  return mockApiCall(
    withDelete(
      () => tuyenDuongDataService.deleteTuyenDuong(id),
      ErrorCodes.NOT_FOUND,
      'Tuyến đường không tồn tại'
    ),
    'TuyenDuong'
  );
};

// For testing and resetting
export const _resetTuyenDuong = async (newData = []) => {
  return mockApiCall(() => tuyenDuongDataService._resetTuyenDuong(newData), 'TuyenDuong');
};

export const getTuyenDuongCount = async () => {
  return mockApiCall(
    withSingleItem(
      () => tuyenDuongDataService.getTuyenDuongCount(),
      ErrorCodes.NOT_FOUND,
      'Không thể lấy số lượng tuyến đường'
    ),
    'TuyenDuong'
  );
};
