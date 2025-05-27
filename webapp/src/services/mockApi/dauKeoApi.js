// Mock API services for DauKeo (Tractor Units)
import * as dauKeoDataService from '@services/mockData/dauKeo';

const SIMULATED_DELAY = 0; // ms - No delay

const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    // If delay is 0, execute immediately.
    // Still using setTimeout to maintain async structure if delay is re-introduced.
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (DauKeo):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllDauKeo = () => {
  console.log('[Mock API] Fetching all DauKeo...');
  return simulateApiCall(dauKeoDataService.getAllDauKeo);
};

export const fetchDauKeoById = id => {

  return simulateApiCall(() => dauKeoDataService.getDauKeoById(id));
};

export const addDauKeo = data => {
  console.log('[Mock API] Creating DauKeo:', data);
  return simulateApiCall(() => dauKeoDataService.createDauKeo(data));
};

export const editDauKeo = (id, data) => {

  return simulateApiCall(() => dauKeoDataService.updateDauKeo(id, data));
};

export const removeDauKeo = id => {

  return simulateApiCall(() => dauKeoDataService.deleteDauKeo(id));
};

export const _resetDauKeoMockData = data => {
  console.log('[Mock API] Resetting DauKeo Data (via API layer)...');
  return simulateApiCall(() => dauKeoDataService._resetDauKeo(data));
};

export const getDauKeoCount = () => simulateApiCall(dauKeoDataService.getDauKeoCount);

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

console.log('DauKeo Mock API service loaded and configured.');
