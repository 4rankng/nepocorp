// Mock database for Định mức dầu
// Fields: id (string), bienSoXe (string), phan_loai (string), tuKm (number), denKm (number), l_km (number), ghiChu (string), createdAt (ISO String), updatedAt (ISO String)
let dinhMucDauData = [
  // Định mức cho đầu kéo 51C-001.01
  {
    id: '1',
    bienSoXe: '51C-001.01',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 50000,
    l_km: 0.35,
    ghiChu: 'Đầu kéo Hino - Có hàng',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2023-01-01T08:00:00Z',
  },
  {
    id: '2',
    bienSoXe: '51C-001.01',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 50000,
    l_km: 0.28,
    ghiChu: 'Đầu kéo Hino - Vỏ rỗng',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2023-01-01T08:00:00Z',
  },
  {
    id: '3',
    bienSoXe: '51C-001.01',
    phan_loai: 'km_vo',
    tuKm: 50000,
    denKm: 100000,
    l_km: 0.25,
    ghiChu: 'Đầu kéo Hino - Vỏ rỗng (sau 50k km)',
    createdAt: '2023-01-01T08:00:00Z',
    updatedAt: '2023-01-01T08:00:00Z',
  },
  // Định mức cho đầu kéo 29H-111.22
  {
    id: '4',
    bienSoXe: '29H-111.22',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 40000,
    l_km: 0.38,
    ghiChu: 'Đầu kéo Hyundai - Có hàng',
    createdAt: '2023-01-15T08:00:00Z',
    updatedAt: '2023-01-15T08:00:00Z',
  },
  {
    id: '5',
    bienSoXe: '29H-111.22',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 40000,
    l_km: 0.3,
    ghiChu: 'Đầu kéo Hyundai - Vỏ rỗng',
    createdAt: '2023-01-15T08:00:00Z',
    updatedAt: '2023-01-15T08:00:00Z',
  },
  // Định mức cho đầu kéo 60A-222.33
  {
    id: '6',
    bienSoXe: '60A-222.33',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 30000,
    l_km: 0.32,
    ghiChu: 'Đầu kéo Fuso - Vỏ rỗng',
    createdAt: '2023-02-01T08:00:00Z',
    updatedAt: '2023-02-01T08:00:00Z',
  },
  {
    id: '7',
    bienSoXe: '60A-222.33',
    phan_loai: 'km_vo',
    tuKm: 30000,
    denKm: 80000,
    l_km: 0.29,
    ghiChu: 'Đầu kéo Fuso - Vỏ rỗng (sau 30k km)',
    createdAt: '2023-02-01T08:00:00Z',
    updatedAt: '2023-02-01T08:00:00Z',
  },
  // Định mức cho đầu kéo 51C-333.44
  {
    id: '8',
    bienSoXe: '51C-333.44',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 60000,
    l_km: 0.36,
    ghiChu: 'Đầu kéo Isuzu - Có hàng',
    createdAt: '2023-02-20T08:00:00Z',
    updatedAt: '2023-02-20T08:00:00Z',
  },
  {
    id: '9',
    bienSoXe: '51C-333.44',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 60000,
    l_km: 0.27,
    ghiChu: 'Đầu kéo Isuzu - Vỏ rỗng',
    createdAt: '2023-02-20T08:00:00Z',
    updatedAt: '2023-02-20T08:00:00Z',
  },
  // Định mức cho đầu kéo 29H-444.55
  {
    id: '10',
    bienSoXe: '29H-444.55',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 25000,
    l_km: 0.31,
    ghiChu: 'Đầu kéo Daewoo - Vỏ rỗng',
    createdAt: '2023-03-05T08:00:00Z',
    updatedAt: '2023-03-05T08:00:00Z',
  },
  {
    id: '11',
    bienSoXe: '29H-444.55',
    phan_loai: 'km_vo',
    tuKm: 25000,
    denKm: 75000,
    l_km: 0.28,
    ghiChu: 'Đầu kéo Daewoo - Vỏ rỗng (sau 25k km)',
    createdAt: '2023-03-05T08:00:00Z',
    updatedAt: '2023-03-05T08:00:00Z',
  },
  // Định mức cho đầu kéo 51C-666.77
  {
    id: '12',
    bienSoXe: '51C-666.77',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 45000,
    l_km: 0.33,
    ghiChu: 'Đầu kéo Howo - Vỏ rỗng',
    createdAt: '2023-04-01T08:00:00Z',
    updatedAt: '2023-04-01T08:00:00Z',
  },
  {
    id: '13',
    bienSoXe: '51C-666.77',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 45000,
    l_km: 0.42,
    ghiChu: 'Đầu kéo Howo - Có hàng',
    createdAt: '2023-04-01T08:00:00Z',
    updatedAt: '2023-04-01T08:00:00Z',
  },
  // Thêm định mức km_hang cho các xe còn lại
  {
    id: '14',
    bienSoXe: '60A-222.33',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 30000,
    l_km: 0.4,
    ghiChu: 'Đầu kéo Fuso - Có hàng',
    createdAt: '2023-02-01T08:00:00Z',
    updatedAt: '2023-02-01T08:00:00Z',
  },
  {
    id: '15',
    bienSoXe: '60A-222.33',
    phan_loai: 'km_hang',
    tuKm: 30000,
    denKm: 80000,
    l_km: 0.37,
    ghiChu: 'Đầu kéo Fuso - Có hàng (sau 30k km)',
    createdAt: '2023-02-01T08:00:00Z',
    updatedAt: '2023-02-01T08:00:00Z',
  },
  {
    id: '16',
    bienSoXe: '29H-444.55',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 25000,
    l_km: 0.39,
    ghiChu: 'Đầu kéo Daewoo - Có hàng',
    createdAt: '2023-03-05T08:00:00Z',
    updatedAt: '2023-03-05T08:00:00Z',
  },
  {
    id: '17',
    bienSoXe: '29H-444.55',
    phan_loai: 'km_hang',
    tuKm: 25000,
    denKm: 75000,
    l_km: 0.36,
    ghiChu: 'Đầu kéo Daewoo - Có hàng (sau 25k km)',
    createdAt: '2023-03-05T08:00:00Z',
    updatedAt: '2023-03-05T08:00:00Z',
  },
  // Thêm định mức cho các xe khác từ dauKeo data
  {
    id: '18',
    bienSoXe: '60A-555.66',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 35000,
    l_km: 0.41,
    ghiChu: 'Đầu kéo Chenglong - Có hàng',
    createdAt: '2023-03-10T08:00:00Z',
    updatedAt: '2023-03-10T08:00:00Z',
  },
  {
    id: '19',
    bienSoXe: '60A-555.66',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 35000,
    l_km: 0.32,
    ghiChu: 'Đầu kéo Chenglong - Vỏ rỗng',
    createdAt: '2023-03-10T08:00:00Z',
    updatedAt: '2023-03-10T08:00:00Z',
  },
  {
    id: '20',
    bienSoXe: '60A-555.66',
    phan_loai: 'km_hang',
    tuKm: 35000,
    denKm: 85000,
    l_km: 0.38,
    ghiChu: 'Đầu kéo Chenglong - Có hàng (sau 35k km)',
    createdAt: '2023-03-10T08:00:00Z',
    updatedAt: '2023-03-10T08:00:00Z',
  },
  {
    id: '21',
    bienSoXe: '60A-555.66',
    phan_loai: 'km_vo',
    tuKm: 35000,
    denKm: 85000,
    l_km: 0.29,
    ghiChu: 'Đầu kéo Chenglong - Vỏ rỗng (sau 35k km)',
    createdAt: '2023-03-10T08:00:00Z',
    updatedAt: '2023-03-10T08:00:00Z',
  },
  // Thêm xe mới với định mức phức tạp hơn
  {
    id: '22',
    bienSoXe: '51C-777.88',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 20000,
    l_km: 0.44,
    ghiChu: 'Xe mới - Có hàng (giai đoạn chạy rà)',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2023-05-01T08:00:00Z',
  },
  {
    id: '23',
    bienSoXe: '51C-777.88',
    phan_loai: 'km_hang',
    tuKm: 20000,
    denKm: 50000,
    l_km: 0.39,
    ghiChu: 'Xe mới - Có hàng (đã qua rà)',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2023-05-01T08:00:00Z',
  },
  {
    id: '24',
    bienSoXe: '51C-777.88',
    phan_loai: 'km_hang',
    tuKm: 50000,
    denKm: 100000,
    l_km: 0.36,
    ghiChu: 'Xe mới - Có hàng (ổn định)',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2023-05-01T08:00:00Z',
  },
  {
    id: '25',
    bienSoXe: '51C-777.88',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 20000,
    l_km: 0.34,
    ghiChu: 'Xe mới - Vỏ rỗng (giai đoạn chạy rà)',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2023-05-01T08:00:00Z',
  },
  {
    id: '26',
    bienSoXe: '51C-777.88',
    phan_loai: 'km_vo',
    tuKm: 20000,
    denKm: 50000,
    l_km: 0.3,
    ghiChu: 'Xe mới - Vỏ rỗng (đã qua rà)',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2023-05-01T08:00:00Z',
  },
  {
    id: '27',
    bienSoXe: '51C-777.88',
    phan_loai: 'km_vo',
    tuKm: 50000,
    denKm: 100000,
    l_km: 0.27,
    ghiChu: 'Xe mới - Vỏ rỗng (ổn định)',
    createdAt: '2023-05-01T08:00:00Z',
    updatedAt: '2023-05-01T08:00:00Z',
  },
  // Thêm định mức cho xe cũ với tiêu thụ cao hơn
  {
    id: '28',
    bienSoXe: '29H-888.99',
    phan_loai: 'km_hang',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.45,
    ghiChu: 'Xe cũ - Có hàng (tiêu thụ cao)',
    createdAt: '2023-06-01T08:00:00Z',
    updatedAt: '2023-06-01T08:00:00Z',
  },
  {
    id: '29',
    bienSoXe: '29H-888.99',
    phan_loai: 'km_hang',
    tuKm: 100000,
    denKm: 200000,
    l_km: 0.48,
    ghiChu: 'Xe cũ - Có hàng (tiêu thụ rất cao)',
    createdAt: '2023-06-01T08:00:00Z',
    updatedAt: '2023-06-01T08:00:00Z',
  },
  {
    id: '30',
    bienSoXe: '29H-888.99',
    phan_loai: 'km_vo',
    tuKm: 0,
    denKm: 100000,
    l_km: 0.35,
    ghiChu: 'Xe cũ - Vỏ rỗng (tiêu thụ cao)',
    createdAt: '2023-06-01T08:00:00Z',
    updatedAt: '2023-06-01T08:00:00Z',
  },
  {
    id: '31',
    bienSoXe: '29H-888.99',
    phan_loai: 'km_vo',
    tuKm: 100000,
    denKm: 200000,
    l_km: 0.38,
    ghiChu: 'Xe cũ - Vỏ rỗng (tiêu thụ rất cao)',
    createdAt: '2023-06-01T08:00:00Z',
    updatedAt: '2023-06-01T08:00:00Z',
  },
];
// CRUD Operations
export const getAllDinhMucDau = async () => {
  return [...dinhMucDauData];
};
export const getDinhMucDauById = async id => {
  return dinhMucDauData.find(item => item.id === id) || null;
};
export const createDinhMucDau = async dinhMucDau => {
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
export const deleteDinhMucDau = async id => {
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
