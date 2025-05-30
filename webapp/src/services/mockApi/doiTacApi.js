// Mock API services for DoiTac (Partners)
import * as doiTacDataService from '@services/mockData/doiTac';
import {
  mockApiCall,
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  ERROR_CODES,
} from './apiWrapper.js';
export const fetchAllDoiTac = (page = 1, limit = 10) => {
  return mockApiCall(
    withPagination(() => doiTacDataService.getAllDoiTac(), page, limit),
    'DoiTac'
  );
};

export const fetchDoiTacById = id => {
  return mockApiCall(
    withSingleItem(
      () => doiTacDataService.getDoiTacById(id),
      ERROR_CODES.NOT_FOUND,
      'Đối tác không tồn tại'
    ),
    'DoiTac'
  );
};

export const addDoiTac = data => {
  return mockApiCall(
    withCreate(() => doiTacDataService.createDoiTac(data)),
    'DoiTac'
  );
};

export const editDoiTac = (id, data) => {
  return mockApiCall(
    withUpdate(
      () => doiTacDataService.updateDoiTac(id, data),
      ERROR_CODES.NOT_FOUND,
      'Đối tác không tồn tại'
    ),
    'DoiTac'
  );
};

export const removeDoiTac = id => {
  return mockApiCall(
    withDelete(
      () => doiTacDataService.deleteDoiTac(id),
      ERROR_CODES.NOT_FOUND,
      'Đối tác không tồn tại'
    ),
    'DoiTac'
  );
};

export const _resetDoiTacMockData = data => {
  return mockApiCall(() => doiTacDataService._resetDoiTac(data), 'DoiTac');
};
