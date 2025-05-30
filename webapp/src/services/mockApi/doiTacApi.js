// Mock API services for DoiTac (Partners)
import * as doiTacDataService from '@services/mockData/doiTac';
import {
  mockApiCall,
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  ErrorCodes,
} from './apiWrapper.js';
export const fetchAllDoiTac = (page = 1, limit = 10) => {
  return mockApiCall(() => withPagination(() => doiTacDataService.getAllDoiTac(), { page, limit }));
};

export const fetchDoiTacById = id => {
  return mockApiCall(() =>
    withSingleItem(
      () => doiTacDataService.getDoiTacById(id),
      ErrorCodes.NOT_FOUND,
      'Đối tác không tồn tại'
    )
  );
};

export const addDoiTac = data => {
  return mockApiCall(() => withCreate(() => doiTacDataService.createDoiTac(data)));
};

export const editDoiTac = (id, data) => {
  return mockApiCall(() =>
    withUpdate(
      () => doiTacDataService.updateDoiTac(id, data),
      ErrorCodes.NOT_FOUND,
      'Đối tác không tồn tại'
    )
  );
};

export const removeDoiTac = id => {
  return mockApiCall(() =>
    withDelete(
      () => doiTacDataService.deleteDoiTac(id),
      ErrorCodes.NOT_FOUND,
      'Đối tác không tồn tại'
    )
  );
};

export const _resetDoiTacMockData = data => {
  return mockApiCall(() => doiTacDataService._resetDoiTac(data));
};
