// Mock database for Tuyến đường
// Fields: id (number, primary key), ma_so (string), diem_di (string), diem_den (string), createdAt (ISO String), updatedAt (ISO String)
const STORAGE_KEY = 'mock_tuyen_duong_data';

// Initial data
const initialData = [
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
  {
    id: 3,
    ma_so: 'TD003',
    diem_di: 'Da Nang',
    diem_den: 'Hue; Quang Nam',
    createdAt: '2023-01-17T11:00:00Z',
    updatedAt: '2024-05-12T16:30:00Z',
  },
  {
    id: 4,
    ma_so: 'TD004',
    diem_di: 'Sai Gon',
    diem_den: 'Can Tho; Vung Tau',
    createdAt: '2023-01-18T12:00:00Z',
    updatedAt: '2024-05-13T17:35:00Z',
  },
  {
    id: 5,
    ma_so: 'TD005',
    diem_di: 'Quang Ninh',
    diem_den: 'Hai Phong; Ha Noi',
    createdAt: '2023-01-19T13:00:00Z',
    updatedAt: '2024-05-14T18:40:00Z',
  },
  {
    id: 6,
    ma_so: 'TD006',
    diem_di: 'Vinh',
    diem_den: 'Ha Tinh; Quang Binh',
    createdAt: '2023-01-20T14:00:00Z',
    updatedAt: '2024-05-15T19:45:00Z',
  },
  {
    id: 7,
    ma_so: 'TD007',
    diem_di: 'Nha Trang',
    diem_den: 'Phan Thiet; Da Lat',
    createdAt: '2023-01-21T15:00:00Z',
    updatedAt: '2024-05-16T20:50:00Z',
  },
  {
    id: 8,
    ma_so: 'TD008',
    diem_di: 'Can Tho',
    diem_den: 'Sai Gon; Soc Trang',
    createdAt: '2023-01-22T16:00:00Z',
    updatedAt: '2024-05-17T21:55:00Z',
  },
  {
    id: 9,
    ma_so: 'TD009',
    diem_di: 'Hue',
    diem_den: 'Da Nang; Quang Tri',
    createdAt: '2023-01-23T17:00:00Z',
    updatedAt: '2024-05-18T22:00:00Z',
  },
  {
    id: 10,
    ma_so: 'TD010',
    diem_di: 'Vung Tau',
    diem_den: 'Sai Gon; Can Tho',
    createdAt: '2023-01-24T18:00:00Z',
    updatedAt: '2024-05-19T23:05:00Z',
  },
  {
    id: 11,
    ma_so: 'TD011',
    diem_di: 'Quy Nhon',
    diem_den: 'Pleiku; Da Nang',
    createdAt: '2023-01-25T19:00:00Z',
    updatedAt: '2024-05-20T00:10:00Z',
  },
  {
    id: 12,
    ma_so: 'TD012',
    diem_di: 'Phan Thiet',
    diem_den: 'Nha Trang; Sai Gon',
    createdAt: '2023-01-26T20:00:00Z',
    updatedAt: '2024-05-21T01:15:00Z',
  },
];

// Helper functions for localStorage
const getStoredData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialData;
};

const setStoredData = data => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// CRUD Operations
export const getAllTuyenDuong = async () => {
  return getStoredData();
};

export const getTuyenDuongById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const data = getStoredData();
  return data.find(item => item.id === numericId) || null;
};

export const getTuyenDuongByMaSo = async ma_so => {
  const data = getStoredData();
  return data.find(item => item.ma_so === ma_so) || null;
};

export const createTuyenDuong = async tuyenDuong => {
  const data = getStoredData();
  const newTuyenDuong = {
    ...tuyenDuong,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.push(newTuyenDuong);
  setStoredData(data);
  return newTuyenDuong;
};

export const updateTuyenDuong = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const data = getStoredData();
  const index = data.findIndex(item => item.id === numericId);
  if (index === -1) return null;
  const updatedTuyenDuong = {
    ...data[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  data[index] = updatedTuyenDuong;
  setStoredData(data);
  return updatedTuyenDuong;
};

export const deleteTuyenDuong = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const data = getStoredData();
  const index = data.findIndex(item => item.id === numericId);
  if (index === -1) return false;
  const newData = data.filter(item => item.id !== numericId);
  setStoredData(newData);
  return true;
};

// For testing and resetting
export const _resetTuyenDuong = (newData = []) => {
  const data = newData.length > 0 ? newData : initialData;
  setStoredData(data);
  return data;
};

// Get count
export const getTuyenDuongCount = async () => getStoredData().length;
