// Mock API services for DauKeo (Tractor Units)
import * as dauKeoDataService from '@services/mockData/dauKeo';
import {
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  createApiSingleResponse,
  mockApiCall,
} from './apiWrapper.js';
export const fetchAllDauKeo = (page = 1, limit = 50) => {
  return mockApiCall(() => withPagination(() => dauKeoDataService.getAllDauKeo(), { page, limit }));
};
export const fetchDauKeoById = id => {
  return mockApiCall(() =>
    withSingleItem(() => dauKeoDataService.getDauKeoById(id), 'Dau keo not found')
  );
};
export const addDauKeo = data => {
  return mockApiCall(() =>
    withCreate(() => dauKeoDataService.createDauKeo(data), 'Dau keo created successfully')
  );
};
export const editDauKeo = (id, data) => {
  return mockApiCall(() =>
    withUpdate(
      () => dauKeoDataService.updateDauKeo(id, data),
      'Dau keo not found',
      'Dau keo updated successfully'
    )
  );
};
export const removeDauKeo = id => {
  return mockApiCall(() =>
    withDelete(
      () => dauKeoDataService.deleteDauKeo(id),
      'Dau keo not found',
      'Dau keo deleted successfully'
    )
  );
};
export const _resetDauKeoMockData = data => {
  return mockApiCall(() =>
    createApiSingleResponse(dauKeoDataService._resetDauKeo(data), 'Dau keo data reset successfully')
  );
};
export const getDauKeoCount = async () => {
  return mockApiCall(async () => {
    const count = await dauKeoDataService.getDauKeoCount();
    return createApiSingleResponse({ count }, 'Dau keo count retrieved');
  });
};
// Export object for backward compatibility
export const dauKeoApi = {
  getAll: fetchAllDauKeo,
  getById: fetchDauKeoById,
  create: addDauKeo,
  update: editDauKeo,
  delete: removeDauKeo,
  _reset: _resetDauKeoMockData,
  getCount: getDauKeoCount,
};
