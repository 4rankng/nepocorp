// API service for DinhMucBoSung

export const dinhMucBoSungApi = {
  // Get all DinhMucBoSung records
  getAll: async () => {
    return [];
  },

  // Get DinhMucBoSung by ID
  getById: async id => {
    return null;
  },

  // Get DinhMucBoSung by license plate (bien_so)
  getByBienSo: async bienSo => {
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
  update: async (id, data) => {
    // Validate required fields
    if (
      data.dinh_muc_l !== undefined &&
      (typeof data.dinh_muc_l !== 'number' || data.dinh_muc_l < 0)
    ) {
      throw new Error('Định mức phải là số dương');
    }

    return { id, ...data };
  },

  // Delete DinhMucBoSung
  delete: async id => {
    return { success: true };
  },
};
