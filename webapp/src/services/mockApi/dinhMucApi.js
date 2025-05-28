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
  return simulateApiCall(dinhMucDataService.getAllDinhMuc);
};

export const fetchDinhMucById = id => {
  return simulateApiCall(() => dinhMucDataService.getDinhMucById(id));
};

export const getByBienSoAndType = (bienSoXe, type) => {
  return simulateApiCall(async () => {
    const data = await dinhMucDataService.getDinhMucByBienSoAndType(bienSoXe, type);
    return { data };
  });
};

export const addDinhMuc = data => {
  // Renamed from createDinhMuc to follow convention like addKhachHang
  return simulateApiCall(() => dinhMucDataService.createDinhMuc(data));
};

export const editDinhMuc = (id, data) => {
  // Renamed from updateDinhMuc to follow convention

  return simulateApiCall(() => dinhMucDataService.updateDinhMuc(id, data));
};

export const removeDinhMuc = id => {
  // Renamed from deleteDinhMuc to follow convention

  return simulateApiCall(() => dinhMucDataService.deleteDinhMuc(id));
};

// For testing purposes, if needed by the API layer
export const _resetDinhMucApiData = data => {
  // Renamed for clarity
  return simulateApiCall(() => dinhMucDataService._resetDinhMuc(data));
};

// Bo Sung (Supplementary) related methods - delegate to cauHinhApi
export const getBoSung = () => {
  return simulateApiCall(async () => {
    const response = await cauHinhApi.getDinhMucBoSung();
    return response;
  });
};

export const updateBoSung = value => {
  return cauHinhApi.updateDinhMucBoSung(value);
};

// Export object for backward compatibility
export const dinhMucApi = {
  getAll: fetchAllDinhMuc,
  getById: fetchDinhMucById,
  getByBienSoAndType: getByBienSoAndType,
  create: addDinhMuc,
  update: editDinhMuc,
  delete: removeDinhMuc,
  getBoSung: getBoSung,
  updateBoSung: updateBoSung,
  // Aliases for useDinhMucManagement hook
  getSupplementaryStandard: getBoSung,
  updateSupplementaryStandard: updateBoSung,
  _reset: _resetDinhMucApiData,
};
