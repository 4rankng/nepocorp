import * as dinhMucDauDataService from '@services/mockData/dinhMucDau';
import {
  mockApiCall,
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  ErrorCodes,
} from './apiWrapper.js';

export const getAllDinhMucDau = async (page = 1, limit = 10) => {
  return mockApiCall(() =>
    withPagination(() => dinhMucDauDataService.getAllDinhMucDau(), { page, limit })
  );
};

export const getDinhMucDauById = async id => {
  return mockApiCall(() =>
    withSingleItem(
      () => dinhMucDauDataService.getDinhMucDauById(id),
      ErrorCodes.NOT_FOUND,
      'Định mức dầu không tồn tại'
    )
  );
};

export const createDinhMucDau = async dinhMucDau => {
  return mockApiCall(() => withCreate(() => dinhMucDauDataService.createDinhMucDau(dinhMucDau)));
};

export const updateDinhMucDau = async (id, updates) => {
  return mockApiCall(() =>
    withUpdate(
      () => dinhMucDauDataService.updateDinhMucDau(id, updates),
      ErrorCodes.NOT_FOUND,
      'Định mức dầu không tồn tại'
    )
  );
};

export const deleteDinhMucDau = async id => {
  return mockApiCall(() =>
    withDelete(
      () => dinhMucDauDataService.deleteDinhMucDau(id),
      ErrorCodes.NOT_FOUND,
      'Định mức dầu không tồn tại'
    )
  );
};

// For testing and resetting
export const _resetDinhMucDau = async (newData = []) => {
  return mockApiCall(() => dinhMucDauDataService._resetDinhMucDau(newData));
};

export const getDinhMucDauCount = async () => {
  return mockApiCall(() =>
    withSingleItem(
      () => dinhMucDauDataService.getDinhMucDauCount(),
      ErrorCodes.NOT_FOUND,
      'Không thể lấy số lượng định mức dầu'
    )
  );
};

// Alias exports for simplified naming
export const create = createDinhMucDau;
export const update = updateDinhMucDau;
export const delete_ = deleteDinhMucDau;
export { deleteDinhMucDau as delete };
