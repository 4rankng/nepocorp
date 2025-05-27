// Mock API services for RoMooc (Trailers)
import * as roMoocDataService from '@services/mockData/roMooc';

const SIMULATED_DELAY = 0; // ms - No delay

const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (RoMooc):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllRoMooc = () => {

  return simulateApiCall(roMoocDataService.getAllRoMooc);
};

export const fetchRoMoocById = id => {

  return simulateApiCall(() => roMoocDataService.getRoMoocById(id));
};

export const addRoMooc = data => {

  return simulateApiCall(() => roMoocDataService.createRoMooc(data));
};

export const editRoMooc = (id, data) => {

  return simulateApiCall(() => roMoocDataService.updateRoMooc(id, data));
};

export const removeRoMooc = id => {

  return simulateApiCall(() => roMoocDataService.deleteRoMooc(id));
};

export const _resetRoMoocMockData = data => {
  console.log('[Mock API] Resetting RoMooc Data (via API layer)...');
  return simulateApiCall(() => roMoocDataService._resetRoMooc(data));
};

export const getRoMoocCount = () => simulateApiCall(roMoocDataService.getRoMoocCount);

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

console.log('RoMooc Mock API service loaded and configured (no delay).');
