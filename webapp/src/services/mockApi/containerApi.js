// Mock API services for Container
import * as containerDataService from '@services/mockData/container';
import {
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  createApiSingleResponse,
  mockApiCall,
} from './apiWrapper.js';

export const fetchAllContainer = (page = 1, limit = 50) => {
  return mockApiCall(() => 
    withPagination(() => containerDataService.getAllContainer(), { page, limit })
  );
};

export const fetchContainerById = id => {
  return mockApiCall(() => 
    withSingleItem(() => containerDataService.getContainerById(id), 'Container not found')
  );
};

export const addContainer = data => {
  return mockApiCall(() => 
    withCreate(() => containerDataService.createContainer(data), 'Container created successfully')
  );
};

export const editContainer = (id, data) => {
  return mockApiCall(() => 
    withUpdate(
      () => containerDataService.updateContainer(id, data),
      'Container not found',
      'Container updated successfully'
    )
  );
};

export const removeContainer = id => {
  return mockApiCall(() => 
    withDelete(
      () => containerDataService.deleteContainer(id),
      'Container not found',
      'Container deleted successfully'
    )
  );
};

export const _resetContainerMockData = data => {
  return mockApiCall(() => 
    createApiSingleResponse(
      containerDataService._resetContainer(data),
      'Container data reset successfully'
    )
  );
};

export const getContainerCount = async () => {
  return mockApiCall(async () => {
    const count = await containerDataService.getContainerCount();
    return createApiSingleResponse({ count }, 'Container count retrieved');
  });
};

export const containerApi = {
  getAll: fetchAllContainer,
  getById: fetchContainerById,
  create: addContainer,
  update: editContainer,
  delete: removeContainer,
  _reset: _resetContainerMockData,
  getCount: getContainerCount,
};
