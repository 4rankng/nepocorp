// API service for DinhMucBoSung

export const dinhMucBoSungApi = {
  // Get all DinhMucBoSung records
  getAll: async () => {
    return [];
  },

  // Get DinhMucBoSung by ID
  getById: async _id => {
    return null;
  },

  // Get DinhMucBoSung by license plate (bien_so)
  getByBienSo: async _bienSo => {
    return [];
  },

  // Create new DinhMucBoSung
  create: async data => {
    // Validate required fields
    if (typeof data.dinh_muc_l !== 'number' || data.dinh_muc_l < 0) {
      throw new Error('Định mức phải là số dương');
    }

    return { id: Date.now(), ...data };
  },

  // Update existing DinhMucBoSung
  update: async (_id, data) => {
    // Validate required fields
    if (
      data.dinh_muc_l !== undefined &&
      (typeof data.dinh_muc_l !== 'number' || data.dinh_muc_l < 0)
    ) {
      throw new Error('Định mức phải là số dương');
    }

    return { id: _id, ...data };
  },

  // Delete DinhMucBoSung
  delete: async _id => {
    return { success: true };
  },
};
