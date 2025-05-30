// Mock API services for CauHinh (Configuration)
// This will interact with mockData/cauHinh.js
import * as cauHinhDataService from '@services/mockData/cauHinh';
import {
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  createApiSingleResponse,
  mockApiCall,
  ErrorCodes,
  createApiErrorResponse,
} from './apiWrapper.js';
export const fetchAllCauHinh = (page = 1, limit = 50) => {
  return mockApiCall(() =>
    withPagination(() => cauHinhDataService.getAllCauHinh(), { page, limit })
  );
};
export const fetchCauHinhById = id => {
  return mockApiCall(() =>
    withSingleItem(() => cauHinhDataService.getCauHinhById(id), 'Cau hinh not found')
  );
};
export const fetchCauHinhByKey = key => {
  return mockApiCall(() =>
    withSingleItem(() => cauHinhDataService.getCauHinhByKey(key), 'Cau hinh not found')
  );
};
export const addCauHinh = data => {
  return mockApiCall(() =>
    withCreate(() => cauHinhDataService.createCauHinh(data), 'Cau hinh created successfully')
  );
};
export const editCauHinh = (id, data) => {
  return mockApiCall(() =>
    withUpdate(
      () => cauHinhDataService.updateCauHinh(id, data),
      'Cau hinh not found',
      'Cau hinh updated successfully'
    )
  );
};
export const editCauHinhByKey = (key, value) => {
  return mockApiCall(() =>
    withUpdate(
      () => cauHinhDataService.updateCauHinhByKey(key, value),
      'Cau hinh not found',
      'Cau hinh updated successfully'
    )
  );
};
export const removeCauHinh = id => {
  return mockApiCall(() =>
    withDelete(
      () => cauHinhDataService.deleteCauHinh(id),
      'Cau hinh not found',
      'Cau hinh deleted successfully'
    )
  );
};
// Specific method for getting dinh muc bo sung
export const getDinhMucBoSung = () => {
  return mockApiCall(async () => {
    const config = await cauHinhDataService.getCauHinhByKey('dinh_muc_bo_sung');
    const result = config ? { value: parseFloat(config.value) } : { value: 0 };
    return createApiSingleResponse(result, 'Dinh muc bo sung retrieved successfully');
  });
};
// Specific method for updating dinh muc bo sung
export const updateDinhMucBoSung = value => {
  return mockApiCall(async () => {
    // Validate the value parameter
    if (value === undefined || value === null) {
      throw createApiErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Value is required for updating dinh muc bo sung'
      );
    }
    // Ensure value is a number
    const numericValue = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(numericValue)) {
      throw createApiErrorResponse(ErrorCodes.VALIDATION_ERROR, 'Value must be a valid number');
    }
    const updated = await cauHinhDataService.updateCauHinhByKey(
      'dinh_muc_bo_sung',
      numericValue.toString()
    );
    return createApiSingleResponse(
      { value: parseFloat(updated.value) },
      'Dinh muc bo sung updated successfully'
    );
  });
};
// For testing purposes
export const _resetCauHinhApiData = data => {
  return mockApiCall(() =>
    createApiSingleResponse(
      cauHinhDataService._resetCauHinh(data),
      'Cau hinh data reset successfully'
    )
  );
};
// Export object for backward compatibility
export const cauHinhApi = {
  getAll: fetchAllCauHinh,
  getById: fetchCauHinhById,
  getByKey: fetchCauHinhByKey,
  create: addCauHinh,
  update: editCauHinh,
  updateByKey: editCauHinhByKey,
  delete: removeCauHinh,
  getDinhMucBoSung: getDinhMucBoSung,
  updateDinhMucBoSung: updateDinhMucBoSung,
  _reset: _resetCauHinhApiData,
};
