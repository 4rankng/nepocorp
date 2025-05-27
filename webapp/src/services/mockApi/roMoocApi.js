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
  console.log('[Mock API] Fetching all RoMooc...');
  return simulateApiCall(roMoocDataService.getAllRoMooc);
};

export const fetchRoMoocById = id => {
  console.log(`[Mock API] Fetching RoMooc by ID: ${id}`);
  return simulateApiCall(() => roMoocDataService.getRoMoocById(id));
};

export const addRoMooc = data => {
  console.log('[Mock API] Creating RoMooc:', data);
  return simulateApiCall(() => roMoocDataService.createRoMooc(data));
};

export const editRoMooc = (id, data) => {
  console.log(`[Mock API] Updating RoMooc ID: ${id} with data:`, data);
  return simulateApiCall(() => roMoocDataService.updateRoMooc(id, data));
};

export const removeRoMooc = id => {
  console.log(`[Mock API] Deleting RoMooc ID: ${id}`);
  return simulateApiCall(() => roMoocDataService.deleteRoMooc(id));
};

export const _resetRoMoocMockData = data => {
  console.log('[Mock API] Resetting RoMooc Data (via API layer)...');
  return simulateApiCall(() => roMoocDataService._resetRoMooc(data));
};

console.log('RoMooc Mock API service loaded and configured (no delay).');
