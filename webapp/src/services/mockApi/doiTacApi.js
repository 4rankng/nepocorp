// Mock API services for DoiTac (Partners)
import * as doiTacDataService from '@services/mockData/doiTac';

const SIMULATED_DELAY = 0; // ms

const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (DoiTac):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllDoiTac = () => {
  console.log('[Mock API] Fetching all DoiTac...');
  return simulateApiCall(doiTacDataService.getAllDoiTac);
};

export const fetchDoiTacById = id => {

  return simulateApiCall(() => doiTacDataService.getDoiTacById(id));
};

export const addDoiTac = data => {
  console.log('[Mock API] Creating DoiTac:', data);
  return simulateApiCall(() => doiTacDataService.createDoiTac(data));
};

export const editDoiTac = (id, data) => {

  return simulateApiCall(() => doiTacDataService.updateDoiTac(id, data));
};

export const removeDoiTac = id => {

  return simulateApiCall(() => doiTacDataService.deleteDoiTac(id));
};

export const _resetDoiTacMockData = data => {
  console.log('[Mock API] Resetting DoiTac Data (via API layer)...');
  return simulateApiCall(() => doiTacDataService._resetDoiTac(data));
};

console.log('DoiTac Mock API service loaded and configured.');
