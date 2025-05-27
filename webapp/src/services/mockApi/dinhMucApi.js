// Mock API services for Dinh Muc (Fuel Standards)
// This will interact with mockData/dinhMuc.js
import * as dinhMucDataService from '@services/mockData/dinhMuc';
import { cauHinhApi } from '@services/mockApi/cauHinhApi';

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

export const fetchAllDinhMuc = () => {
  console.log('[Mock API] Fetching all Dinh Muc...');
  return simulateApiCall(dinhMucDataService.getAllDinhMuc);
};

export const fetchDinhMucById = id => {
  console.log(`[Mock API] Fetching Dinh Muc by ID: ${id}`);
  return simulateApiCall(() => dinhMucDataService.getDinhMucById(id));
};

export const fetchDinhMucByBienSoAndType = (bienSoXe, type) => {
  console.log(`[Mock API] Fetching Dinh Muc by bien so: ${bienSoXe} and type: ${type}`);
  return simulateApiCall(async () => {
    const data = await dinhMucDataService.getDinhMucByBienSoAndType(bienSoXe, type);
    return { data };
  });
};

export const addDinhMuc = data => {
  // Renamed from createDinhMuc to follow convention like addKhachHang
  console.log('[Mock API] Creating Dinh Muc:', data);
  return simulateApiCall(() => dinhMucDataService.createDinhMuc(data));
};

export const editDinhMuc = (id, data) => {
  // Renamed from updateDinhMuc to follow convention
  console.log(`[Mock API] Updating Dinh Muc ID: ${id} with data:`, data);
  return simulateApiCall(() => dinhMucDataService.updateDinhMuc(id, data));
};

export const removeDinhMuc = id => {
  // Renamed from deleteDinhMuc to follow convention
  console.log(`[Mock API] Deleting Dinh Muc ID: ${id}`);
  return simulateApiCall(() => dinhMucDataService.deleteDinhMuc(id));
};

// For testing purposes, if needed by the API layer
export const _resetDinhMucApiData = data => {
  // Renamed for clarity
  console.log('[Mock API] Resetting Dinh Muc Data (via API layer)...');
  return simulateApiCall(() => dinhMucDataService._resetDinhMuc(data));
};

// Bo Sung (Supplementary) related methods - delegate to cauHinhApi
export const getBoSung = () => {
  console.log('[Mock API] Fetching Bo Sung (Supplementary) from CauHinh...');
  return cauHinhApi.getDinhMucBoSung();
};

export const updateBoSung = value => {
  console.log(`[Mock API] Updating Bo Sung (Supplementary) to: ${value}`);
  return cauHinhApi.updateDinhMucBoSung(value);
};

// Export object for backward compatibility
export const dinhMucApi = {
  getAll: fetchAllDinhMuc,
  getById: fetchDinhMucById,
  getByBienSoAndType: fetchDinhMucByBienSoAndType,
  create: addDinhMuc,
  update: editDinhMuc,
  delete: removeDinhMuc,
  getBoSung: getBoSung,
  updateBoSung: updateBoSung,
  _reset: _resetDinhMucApiData,
};

console.log('Dinh Muc Mock API service loaded and configured.');
