// Mock database for DoiTac (Partners)
// Fields: id (numeric), ma_dinh_danh, ten, dia_chi, ma_so_thue, createdAt, updatedAt
let doiTacData = [
  {
    id: 1,
    ma_dinh_danh: 'DT001',
    ten: 'Công ty TNHH Vận Tải Minh Phát',
    dia_chi: 'Số 1, Đường Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
    ma_so_thue: '0301234567',
    createdAt: '2023-01-10T08:00:00Z',
    updatedAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 2,
    ma_dinh_danh: 'DT002',
    ten: 'Công ty Cổ phần Giao Nhận Hòa Bình',
    dia_chi: 'Số 2, Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
    ma_so_thue: '0302345678',
    createdAt: '2023-01-15T09:00:00Z',
    updatedAt: '2024-05-05T11:00:00Z',
  },
  {
    id: 3,
    ma_dinh_danh: 'DT003',
    ten: 'Công ty TNHH Dịch Vụ Vận Tải Bắc Nam',
    dia_chi: 'Số 3, Đường Trần Hưng Đạo, Quận 5, TP. Hồ Chí Minh',
    ma_so_thue: '0303456789',
    createdAt: '2023-02-01T10:00:00Z',
    updatedAt: '2024-04-20T12:00:00Z',
  },
  {
    id: 4,
    ma_dinh_danh: 'DT004',
    ten: 'Công ty TNHH Logistics Sài Gòn',
    dia_chi: 'Số 4, Đường Phạm Văn Đồng, Quận Thủ Đức, TP. Hồ Chí Minh',
    ma_so_thue: '0304567890',
    createdAt: '2023-02-20T11:00:00Z',
    updatedAt: '2024-05-10T13:00:00Z',
  },
  {
    id: 5,
    ma_dinh_danh: 'DT005',
    ten: 'Công ty TNHH Vận Tải Hà Nội',
    dia_chi: 'Số 5, Đường Giải Phóng, Quận Hoàng Mai, Hà Nội',
    ma_so_thue: '0101234567',
    createdAt: '2023-03-05T12:00:00Z',
    updatedAt: '2024-04-25T14:00:00Z',
  },
  {
    id: 6,
    ma_dinh_danh: 'DT006',
    ten: 'Công ty TNHH Giao Nhận Bắc Hà',
    dia_chi: 'Số 6, Đường Láng, Quận Đống Đa, Hà Nội',
    ma_so_thue: '0102345678',
    createdAt: '2023-03-10T13:00:00Z',
    updatedAt: '2024-05-15T15:00:00Z',
  },
  {
    id: 7,
    ma_dinh_danh: 'DT007',
    ten: 'Công ty TNHH Vận Tải Đà Nẵng',
    dia_chi: 'Số 7, Đường Nguyễn Văn Cừ, Quận Hải Châu, Đà Nẵng',
    ma_so_thue: '0401234567',
    createdAt: '2023-04-01T14:00:00Z',
    updatedAt: '2024-04-30T16:00:00Z',
  },
  {
    id: 8,
    ma_dinh_danh: 'DT008',
    ten: 'Công ty TNHH Logistics Miền Trung',
    dia_chi: 'Số 8, Đường Lê Duẩn, Quận Thanh Khê, Đà Nẵng',
    ma_so_thue: '0402345678',
    createdAt: '2023-04-15T15:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  },
  {
    id: 9,
    ma_dinh_danh: 'DT009',
    ten: 'Công ty TNHH Vận Tải Hải Phòng',
    dia_chi: 'Số 9, Đường Lạch Tray, Quận Ngô Quyền, Hải Phòng',
    ma_so_thue: '0201234567',
    createdAt: '2023-05-02T16:00:00Z',
    updatedAt: '2024-05-02T16:00:00Z',
  },
  {
    id: 10,
    ma_dinh_danh: 'DT010',
    ten: 'Công ty TNHH Giao Nhận Đông Bắc',
    dia_chi: 'Số 10, Đường Trần Phú, Quận Hồng Bàng, Hải Phòng',
    ma_so_thue: '0202345678',
    createdAt: '2023-05-20T17:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  },
];
let nextDoiTacId = 11;
export const getAllDoiTac = async () => {
  return [...doiTacData];
};
export const getDoiTacById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return doiTacData.find(dt => dt.id === numericId) || null;
};
export const createDoiTac = async data => {
  const newDoiTac = {
    ...data,
    id: nextDoiTacId++,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (!data.ma_dinh_danh || !data.ten || !data.dia_chi || !data.ma_so_thue) {
    console.error('Missing required fields for new DoiTac:', data);
    return null;
  }
  doiTacData.push(newDoiTac);
  return newDoiTac;
};
export const updateDoiTac = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = doiTacData.findIndex(dt => dt.id === numericId);
  if (index === -1) return null;
  const { id: _, ...validUpdates } = updates;
  doiTacData[index] = {
    ...doiTacData[index],
    ...validUpdates,
    updatedAt: new Date().toISOString(),
  };
  return doiTacData[index];
};
export const deleteDoiTac = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = doiTacData.findIndex(dt => dt.id === numericId);
  if (index === -1) return false;
  doiTacData.splice(index, 1);
  return true;
};
export const _resetDoiTac = (data = []) => {
  doiTacData = data.map((item, index) => ({ ...item, id: index + 1 }));
  nextDoiTacId = doiTacData.length > 0 ? Math.max(...doiTacData.map(dt => dt.id)) + 1 : 1;
};
if (doiTacData.length > 0) {
  nextDoiTacId = Math.max(...doiTacData.map(dt => dt.id)) + 1;
} else {
  nextDoiTacId = 1;
}
