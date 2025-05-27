// Mock API services for CauHinh (Configuration)
// This will interact with mockData/cauHinh.js
import * as cauHinhDataService from '@services/mockData/cauHinh';

const SIMULATED_DELAY = 0; // ms

const simulateApiCall = fn => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error:', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

export const fetchAllCauHinh = () => {
  console.log('[Mock API] Fetching all CauHinh...');
  return simulateApiCall(cauHinhDataService.getAllCauHinh);
};

export const fetchCauHinhById = id => {
  console.log(`[Mock API] Fetching CauHinh by ID: ${id}`);
  return simulateApiCall(() => cauHinhDataService.getCauHinhById(id));
};

export const fetchCauHinhByKey = key => {
  console.log(`[Mock API] Fetching CauHinh by key: ${key}`);
  return simulateApiCall(() => cauHinhDataService.getCauHinhByKey(key));
};

export const addCauHinh = data => {
  console.log('[Mock API] Creating CauHinh:', data);
  return simulateApiCall(() => cauHinhDataService.createCauHinh(data));
};

export const editCauHinh = (id, data) => {
  console.log(`[Mock API] Updating CauHinh ID: ${id} with data:`, data);
  return simulateApiCall(() => cauHinhDataService.updateCauHinh(id, data));
};

export const editCauHinhByKey = (key, value) => {
  console.log(`[Mock API] Updating CauHinh key: ${key} with value:`, value);
  return simulateApiCall(() => cauHinhDataService.updateCauHinhByKey(key, value));
};

export const removeCauHinh = id => {
  console.log(`[Mock API] Deleting CauHinh ID: ${id}`);
  return simulateApiCall(() => cauHinhDataService.deleteCauHinh(id));
};

// Specific method for getting dinh muc bo sung
export const getDinhMucBoSung = () => {
  console.log('[Mock API] Fetching Dinh Muc Bo Sung...');
  return simulateApiCall(async () => {
    const config = await cauHinhDataService.getCauHinhByKey('dinh_muc_bo_sung');
    return config ? { value: parseFloat(config.value) } : { value: 0 };
  });
};

// Specific method for updating dinh muc bo sung
export const updateDinhMucBoSung = value => {
  console.log(`[Mock API] Updating Dinh Muc Bo Sung to: ${value}`);
  return simulateApiCall(async () => {
    const updated = await cauHinhDataService.updateCauHinhByKey('dinh_muc_bo_sung', value.toString());
    return { value: parseFloat(updated.value) };
  });
};

// For testing purposes
export const _resetCauHinhApiData = data => {
  console.log('[Mock API] Resetting CauHinh Data (via API layer)...');
  return simulateApiCall(() => cauHinhDataService._resetCauHinh(data));
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

console.log('CauHinh Mock API service loaded and configured.');
