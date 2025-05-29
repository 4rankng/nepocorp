// Mock database for Tuyến đường
// Fields: id (number, primary key), ma_so (string), diem_di (string), diem_den (string), createdAt (ISO String), updatedAt (ISO String)
let tuyenDuongData = [
  {
    id: 1,
    ma_so: 'TD001',
    diem_di: 'Hai Phong',
    diem_den: 'Ha Noi; Da Nang; Sai Gon',
    createdAt: '2023-01-15T09:30:00Z',
    updatedAt: '2024-05-10T14:20:00Z',
  },
  {
    id: 2,
    ma_so: 'TD002',
    diem_di: 'Ha Noi',
    diem_den: 'Hai Phong; Quang Ninh',
    createdAt: '2023-01-16T10:00:00Z',
    updatedAt: '2024-05-11T15:25:00Z',
  },
];

// CRUD Operations
export const getAllTuyenDuong = async () => {
  return [...tuyenDuongData];
};

export const getTuyenDuongById = async (id) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return tuyenDuongData.find(item => item.id === numericId) || null;
};

export const getTuyenDuongByMaSo = async (ma_so) => {
  return tuyenDuongData.find(item => item.ma_so === ma_so) || null;
};

export const createTuyenDuong = async (tuyenDuong) => {
  const newTuyenDuong = {
    ...tuyenDuong,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tuyenDuongData.push(newTuyenDuong);
  return newTuyenDuong;
};

export const updateTuyenDuong = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = tuyenDuongData.findIndex(item => item.id === numericId);
  if (index === -1) return null;
  
  const updatedTuyenDuong = {
    ...tuyenDuongData[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  tuyenDuongData[index] = updatedTuyenDuong;
  return updatedTuyenDuong;
};

export const deleteTuyenDuong = async (id) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = tuyenDuongData.findIndex(item => item.id === numericId);
  if (index === -1) return false;
  
  tuyenDuongData = tuyenDuongData.filter(item => item.id !== numericId);
  return true;
};

// For testing and resetting
export const _resetTuyenDuong = (newData = []) => {
  tuyenDuongData = [...newData];
  return tuyenDuongData;
};

// Get count
export const getTuyenDuongCount = async () => tuyenDuongData.length;
