// Mock database for Định mức đi đường (Route Cost Standards)
// Fields: id (number), ma_cont (string), ma_tuyen (string), dinh_muc (number), currency (string), createdAt (ISO String), updatedAt (ISO String)
let dinhMucDiDuongData = [
  {
    id: 1,
    ma_cont: 'CONU1234567',
    ma_tuyen: 'TD001',
    dinh_muc: 100000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 2,
    ma_cont: 'NPOU6543210',
    ma_tuyen: 'TD001',
    dinh_muc: 150000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 3,
    ma_cont: 'CONU1234567',
    ma_tuyen: 'TD002',
    dinh_muc: 120000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 4,
    ma_cont: 'DRYU2233445',
    ma_tuyen: 'TD001',
    dinh_muc: 95000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 5,
    ma_cont: 'REEF1122334',
    ma_tuyen: 'TD002',
    dinh_muc: 180000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 6,
    ma_cont: 'TEST7890123',
    ma_tuyen: 'TD001',
    dinh_muc: 160000,
    currency: 'VND',
    createdAt: '2024-05-28T00:00:00.000Z',
    updatedAt: '2024-05-28T00:00:00.000Z',
  },
  {
    id: 7,
    ma_cont: 'CONU1234567',
    ma_tuyen: 'TD003',
    dinh_muc: 110000,
    currency: 'VND',
    createdAt: '2024-06-01T08:00:00.000Z',
    updatedAt: '2024-06-01T08:00:00.000Z',
  },
  {
    id: 8,
    ma_cont: 'NPOU6543210',
    ma_tuyen: 'TD003',
    dinh_muc: 155000,
    currency: 'VND',
    createdAt: '2024-06-01T08:10:00.000Z',
    updatedAt: '2024-06-01T08:10:00.000Z',
  },
  {
    id: 9,
    ma_cont: 'DRYU2233445',
    ma_tuyen: 'TD003',
    dinh_muc: 98000,
    currency: 'VND',
    createdAt: '2024-06-01T08:20:00.000Z',
    updatedAt: '2024-06-01T08:20:00.000Z',
  },
  {
    id: 10,
    ma_cont: 'REEF1122334',
    ma_tuyen: 'TD003',
    dinh_muc: 182000,
    currency: 'VND',
    createdAt: '2024-06-01T08:30:00.000Z',
    updatedAt: '2024-06-01T08:30:00.000Z',
  },
  {
    id: 11,
    ma_cont: 'TEST7890123',
    ma_tuyen: 'TD003',
    dinh_muc: 162000,
    currency: 'VND',
    createdAt: '2024-06-01T08:40:00.000Z',
    updatedAt: '2024-06-01T08:40:00.000Z',
  },
  {
    id: 12,
    ma_cont: 'CONU1234567',
    ma_tuyen: 'TD004',
    dinh_muc: 113000,
    currency: 'VND',
    createdAt: '2024-06-01T08:50:00.000Z',
    updatedAt: '2024-06-01T08:50:00.000Z',
  },
  {
    id: 13,
    ma_cont: 'NPOU6543210',
    ma_tuyen: 'TD004',
    dinh_muc: 158000,
    currency: 'VND',
    createdAt: '2024-06-01T09:00:00.000Z',
    updatedAt: '2024-06-01T09:00:00.000Z',
  },
  {
    id: 14,
    ma_cont: 'DRYU2233445',
    ma_tuyen: 'TD004',
    dinh_muc: 99000,
    currency: 'VND',
    createdAt: '2024-06-01T09:10:00.000Z',
    updatedAt: '2024-06-01T09:10:00.000Z',
  },
  {
    id: 15,
    ma_cont: 'REEF1122334',
    ma_tuyen: 'TD004',
    dinh_muc: 185000,
    currency: 'VND',
    createdAt: '2024-06-01T09:20:00.000Z',
    updatedAt: '2024-06-01T09:20:00.000Z',
  },
  {
    id: 16,
    ma_cont: 'TEST7890123',
    ma_tuyen: 'TD004',
    dinh_muc: 165000,
    currency: 'VND',
    createdAt: '2024-06-01T09:30:00.000Z',
    updatedAt: '2024-06-01T09:30:00.000Z',
  },
  {
    id: 17,
    ma_cont: 'CONU1234567',
    ma_tuyen: 'TD005',
    dinh_muc: 115000,
    currency: 'VND',
    createdAt: '2024-06-01T09:40:00.000Z',
    updatedAt: '2024-06-01T09:40:00.000Z',
  },
  {
    id: 18,
    ma_cont: 'NPOU6543210',
    ma_tuyen: 'TD005',
    dinh_muc: 160000,
    currency: 'VND',
    createdAt: '2024-06-01T09:50:00.000Z',
    updatedAt: '2024-06-01T09:50:00.000Z',
  },
  {
    id: 19,
    ma_cont: 'DRYU2233445',
    ma_tuyen: 'TD005',
    dinh_muc: 100000,
    currency: 'VND',
    createdAt: '2024-06-01T10:00:00.000Z',
    updatedAt: '2024-06-01T10:00:00.000Z',
  },
  {
    id: 20,
    ma_cont: 'REEF1122334',
    ma_tuyen: 'TD005',
    dinh_muc: 188000,
    currency: 'VND',
    createdAt: '2024-06-01T10:10:00.000Z',
    updatedAt: '2024-06-01T10:10:00.000Z',
  },
  {
    id: 21,
    ma_cont: 'TEST7890123',
    ma_tuyen: 'TD005',
    dinh_muc: 168000,
    currency: 'VND',
    createdAt: '2024-06-01T10:20:00.000Z',
    updatedAt: '2024-06-01T10:20:00.000Z',
  },
  {
    id: 22,
    ma_cont: 'CONU1234567',
    ma_tuyen: 'TD006',
    dinh_muc: 118000,
    currency: 'VND',
    createdAt: '2024-06-01T10:30:00.000Z',
    updatedAt: '2024-06-01T10:30:00.000Z',
  },
  {
    id: 23,
    ma_cont: 'NPOU6543210',
    ma_tuyen: 'TD006',
    dinh_muc: 163000,
    currency: 'VND',
    createdAt: '2024-06-01T10:40:00.000Z',
    updatedAt: '2024-06-01T10:40:00.000Z',
  },
  {
    id: 24,
    ma_cont: 'DRYU2233445',
    ma_tuyen: 'TD006',
    dinh_muc: 102000,
    currency: 'VND',
    createdAt: '2024-06-01T10:50:00.000Z',
    updatedAt: '2024-06-01T10:50:00.000Z',
  },
  {
    id: 25,
    ma_cont: 'REEF1122334',
    ma_tuyen: 'TD006',
    dinh_muc: 191000,
    currency: 'VND',
    createdAt: '2024-06-01T11:00:00.000Z',
    updatedAt: '2024-06-01T11:00:00.000Z',
  },
  {
    id: 26,
    ma_cont: 'TEST7890123',
    ma_tuyen: 'TD006',
    dinh_muc: 171000,
    currency: 'VND',
    createdAt: '2024-06-01T11:10:00.000Z',
    updatedAt: '2024-06-01T11:10:00.000Z',
  },
];
// CRUD Operations
export const getAllDinhMucDiDuong = async () => {
  return [...dinhMucDiDuongData];
};
export const getDinhMucDiDuongById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return dinhMucDiDuongData.find(item => item.id === numericId) || null;
};
export const getDinhMucByContainerAndTuyen = async (ma_cont, ma_tuyen) => {
  return (
    dinhMucDiDuongData.find(item => item.ma_cont === ma_cont && item.ma_tuyen === ma_tuyen) || null
  );
};
export const createDinhMucDiDuong = async dinhMuc => {
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
export const deleteDinhMucDiDuong = async id => {
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
