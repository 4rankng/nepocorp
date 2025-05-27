// Mock API services for Container
import * as containerDataService from '@services/mockData/container';

const SIMULATED_DELAY = 0; // ms - No delay

const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (Container):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllContainer = () => {
  console.log('[Mock API] Fetching all Container...');
  return simulateApiCall(containerDataService.getAllContainer);
};

export const fetchContainerById = id => {
  console.log(`[Mock API] Fetching Container by ID: ${id}`);
  return simulateApiCall(() => containerDataService.getContainerById(id));
};

export const addContainer = data => {
  console.log('[Mock API] Creating Container:', data);
  return simulateApiCall(() => containerDataService.createContainer(data));
};

export const editContainer = (id, data) => {
  console.log(`[Mock API] Updating Container ID: ${id} with data:`, data);
  return simulateApiCall(() => containerDataService.updateContainer(id, data));
};

export const removeContainer = id => {
  console.log(`[Mock API] Deleting Container ID: ${id}`);
  return simulateApiCall(() => containerDataService.deleteContainer(id));
};

export const _resetContainerMockData = data => {
  console.log('[Mock API] Resetting Container Data (via API layer)...');
  return simulateApiCall(() => containerDataService._resetContainer(data));
};

console.log('Container Mock API service loaded and configured (no delay).');
