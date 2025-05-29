// Mock database for Định mức đi đường (Route Cost Standards)
// Fields: id (number), ma_cont (string), ma_tuyen (string), dinh_muc (number), currency (string), createdAt (ISO String), updatedAt (ISO String)
let dinhMucDiDuongData = [
  {
    id: 1,
    ma_cont: '20DC',
    ma_tuyen: 'TD001',
    dinh_muc: 100000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 2,
    ma_cont: '40HC',
    ma_tuyen: 'TD001',
    dinh_muc: 150000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 3,
    ma_cont: '20DC',
    ma_tuyen: 'TD002',
    dinh_muc: 120000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
];

// CRUD Operations
export const getAllDinhMucDiDuong = async () => {
  return [...dinhMucDiDuongData];
};

export const getDinhMucDiDuongById = async (id) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return dinhMucDiDuongData.find(item => item.id === numericId) || null;
};

export const getDinhMucByContainerAndTuyen = async (ma_cont, ma_tuyen) => {
  return dinhMucDiDuongData.find(item => 
    item.ma_cont === ma_cont && item.ma_tuyen === ma_tuyen
  ) || null;
};

export const createDinhMucDiDuong = async (dinhMuc) => {
  const newDinhMuc = {
    ...dinhMuc,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dinhMucDiDuongData.push(newDinhMuc);
  return newDinhMuc;
};

export const updateDinhMucDiDuong = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = dinhMucDiDuongData.findIndex(item => item.id === numericId);
  if (index === -1) return null;
  
  const updatedDinhMuc = {
    ...dinhMucDiDuongData[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  dinhMucDiDuongData[index] = updatedDinhMuc;
  return updatedDinhMuc;
};

export const deleteDinhMucDiDuong = async (id) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = dinhMucDiDuongData.findIndex(item => item.id === numericId);
  if (index === -1) return false;
  
  dinhMucDiDuongData = dinhMucDiDuongData.filter(item => item.id !== numericId);
  return true;
};

// For testing and resetting
export const _resetDinhMucDiDuong = (newData = []) => {
  dinhMucDiDuongData = [...newData];
  return dinhMucDiDuongData;
};

// Get count
export const getDinhMucDiDuongCount = async () => dinhMucDiDuongData.length;
