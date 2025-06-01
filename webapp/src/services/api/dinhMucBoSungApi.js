// API service for DinhMucBoSung
import {
  getDinhMucBoSung,
  getDinhMucBoSungById,
  createDinhMucBoSung,
  updateDinhMucBoSung,
  deleteDinhMucBoSung,
} from '../mockData/dinhMucBoSung.js';

// Simulate API delay
const simulateDelay = (min = 200, max = 800) => {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Simulate random API errors (5% chance)
const simulateError = () => {
  if (Math.random() < 0.05) {
    throw new Error('Simulated API error');
  }
};

export const dinhMucBoSungApi = {
  // Get all DinhMucBoSung records
  getAll: async () => {
    await simulateDelay();
    simulateError();
    return getDinhMucBoSung();
  },

  // Get DinhMucBoSung by ID
  getById: async id => {
    await simulateDelay();
    simulateError();
    const result = getDinhMucBoSungById(id);
    if (!result) {
      throw new Error('DinhMucBoSung not found');
    }
    return result;
  },

  // Get DinhMucBoSung by license plate (bien_so)
  getByBienSo: async bienSo => {
    await simulateDelay();
    simulateError();
    const allRecords = getDinhMucBoSung();
    if (!bienSo) return allRecords;

    // Return records that match the license plate or are applicable to all vehicles (bien_so is null)
    return allRecords.filter(record => !record.bien_so || record.bien_so === bienSo);
  },

  // Create new DinhMucBoSung
  create: async data => {
    await simulateDelay();
    simulateError();

    // Validate required fields
    if (typeof data.dinh_muc_l !== 'number' || data.dinh_muc_l < 0) {
      throw new Error('Định mức phải là số dương');
    }

    return createDinhMucBoSung(data);
  },

  // Update existing DinhMucBoSung
  update: async (id, data) => {
    await simulateDelay();
    simulateError();

    // Validate required fields
    if (
      data.dinh_muc_l !== undefined &&
      (typeof data.dinh_muc_l !== 'number' || data.dinh_muc_l < 0)
    ) {
      throw new Error('Định mức phải là số dương');
    }

    return updateDinhMucBoSung(id, data);
  },

  // Delete DinhMucBoSung
  delete: async id => {
    await simulateDelay();
    simulateError();
    return deleteDinhMucBoSung(id);
  },
};
