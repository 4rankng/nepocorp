import * as dinhMucDiDuongDataService from '@services/mockData/dinhMucDiDuong';
import {
  mockApiCall,
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  ErrorCodes,
} from './apiWrapper.js';

export const getAllDinhMucDiDuong = async (page = 1, limit = 10) => {
  return mockApiCall(
    withPagination(() => dinhMucDiDuongDataService.getAllDinhMucDiDuong(), page, limit),
    'DinhMucDiDuong'
  );
};

export const getDinhMucDiDuongById = async id => {
  return mockApiCall(
    withSingleItem(
      () => dinhMucDiDuongDataService.getDinhMucDiDuongById(id),
      ErrorCodes.NOT_FOUND,
      'Định mức đi đường không tồn tại'
    ),
    'DinhMucDiDuong'
  );
};

export const getDinhMucByContainerAndTuyen = async (ma_cont, ma_tuyen) => {
  return mockApiCall(
    withSingleItem(
      () => dinhMucDiDuongDataService.getDinhMucByContainerAndTuyen(ma_cont, ma_tuyen),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy định mức cho container và tuyến này'
    ),
    'DinhMucDiDuong'
  );
};

export const createDinhMucDiDuong = async dinhMuc => {
  return mockApiCall(
    withCreate(() => dinhMucDiDuongDataService.createDinhMucDiDuong(dinhMuc)),
    'DinhMucDiDuong'
  );
};

export const updateDinhMucDiDuong = async (id, updates) => {
  return mockApiCall(
    withUpdate(
      () => dinhMucDiDuongDataService.updateDinhMucDiDuong(id, updates),
      ErrorCodes.NOT_FOUND,
      'Định mức đi đường không tồn tại'
    ),
    'DinhMucDiDuong'
  );
};

export const deleteDinhMucDiDuong = async id => {
  return mockApiCall(
    withDelete(
      () => dinhMucDiDuongDataService.deleteDinhMucDiDuong(id),
      ErrorCodes.NOT_FOUND,
      'Định mức đi đường không tồn tại'
    ),
    'DinhMucDiDuong'
  );
};

// For testing and resetting
export const _resetDinhMucDiDuong = async (newData = []) => {
  return mockApiCall(
    () => dinhMucDiDuongDataService._resetDinhMucDiDuong(newData),
    'DinhMucDiDuong'
  );
};

export const getDinhMucDiDuongCount = async () => {
  return mockApiCall(
    withSingleItem(
      () => dinhMucDiDuongDataService.getDinhMucDiDuongCount(),
      ErrorCodes.NOT_FOUND,
      'Không thể lấy số lượng định mức đi đường'
    ),
    'DinhMucDiDuong'
  );
};
