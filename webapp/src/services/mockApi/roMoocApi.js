// Mock API services for RoMooc (Trailers)
import * as roMoocDataService from '@services/mockData/roMooc';
import {
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  createApiSingleResponse,
  mockApiCall,
} from './apiWrapper.js';
export const fetchAllRoMooc = (page = 1, limit = 50) => {
  return mockApiCall(() => withPagination(() => roMoocDataService.getAllRoMooc(), { page, limit }));
};
export const fetchRoMoocById = id => {
  return mockApiCall(() =>
    withSingleItem(() => roMoocDataService.getRoMoocById(id), 'Ro mooc not found')
  );
};
export const addRoMooc = data => {
  return mockApiCall(() =>
    withCreate(() => roMoocDataService.createRoMooc(data), 'Ro mooc created successfully')
  );
};
export const editRoMooc = (id, data) => {
  return mockApiCall(() =>
    withUpdate(
      () => roMoocDataService.updateRoMooc(id, data),
      'Ro mooc not found',
      'Ro mooc updated successfully'
    )
  );
};
export const removeRoMooc = id => {
  return mockApiCall(() =>
    withDelete(
      () => roMoocDataService.deleteRoMooc(id),
      'Ro mooc not found',
      'Ro mooc deleted successfully'
    )
  );
};
export const _resetRoMoocMockData = data => {
  return mockApiCall(() =>
    createApiSingleResponse(roMoocDataService._resetRoMooc(data), 'Ro mooc data reset successfully')
  );
};
export const getRoMoocCount = async () => {
  return mockApiCall(async () => {
    const count = await roMoocDataService.getRoMoocCount();
    return createApiSingleResponse({ count }, 'Ro mooc count retrieved');
  });
};
// Export object for backward compatibility
export const roMoocApi = {
  getAll: fetchAllRoMooc,
  getById: fetchRoMoocById,
  create: addRoMooc,
  update: editRoMooc,
  delete: removeRoMooc,
  _reset: _resetRoMoocMockData,
  getCount: getRoMoocCount,
};
