// Mock database for Định mức dầu
// Fields: id (string), bienSoXe (string), phan_loai (string), tuKm (number), denKm (number), l_km (number), ghiChu (string), createdAt (ISO String), updatedAt (ISO String)
let dinhMucDauData = [
  {
    id: '1',
    bienSoXe: '51C-12345',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 10000,
    l_km: 0.35,
    ghiChu: 'Mới',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2023-01-01T08:00:00Z',
  },
  {
    id: '2',
    bienSoXe: '51C-12345',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 10000,
    l_km: 0.28,
    ghiChu: 'Mới - Vỏ rỗng',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2023-01-01T08:00:00Z',
  },
];

// CRUD Operations
export const getAllDinhMucDau = async () => {
  return [...dinhMucDauData];
};

export const getDinhMucDauById = async (id) => {
  return dinhMucDauData.find(item => item.id === id) || null;
};

export const createDinhMucDau = async (dinhMucDau) => {
  const newDinhMucDau = {
    ...dinhMucDau,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dinhMucDauData.push(newDinhMucDau);
  return newDinhMucDau;
};

export const updateDinhMucDau = async (id, updates) => {
  const index = dinhMucDauData.findIndex(item => item.id === id);
  if (index === -1) return null;
  
  const updatedDinhMucDau = {
    ...dinhMucDauData[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  dinhMucDauData[index] = updatedDinhMucDau;
  return updatedDinhMucDau;
};

export const deleteDinhMucDau = async (id) => {
  const index = dinhMucDauData.findIndex(item => item.id === id);
  if (index === -1) return false;
  
  dinhMucDauData = dinhMucDauData.filter(item => item.id !== id);
  return true;
};

// For testing and resetting
export const _resetDinhMucDau = (newData = []) => {
  dinhMucDauData = [...newData];
  return dinhMucDauData;
};

// Get count
export const getDinhMucDauCount = async () => dinhMucDauData.length;
