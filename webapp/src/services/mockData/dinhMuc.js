// Mock database for DinhMuc (Fuel Standards)
// Fields: id (string), bienSoXe, phan_loai ('km_hang' | 'km_vo'), tuKm, denKm, l_km, ghiChu, createdAt, updatedAt

let dinhMucData = [
  { id: 'dm001', bienSoXe: '51C-12345', phan_loai: 'km_hang', tuKm: 0, denKm: 100000, l_km: 0.35, ghiChu: 'Tiêu chuẩn cho xe mới, có hàng', createdAt: '2023-01-01T08:00:00Z', updatedAt: '2024-05-01T08:00:00Z' },
  { id: 'dm002', bienSoXe: '51C-12345', phan_loai: 'km_vo', tuKm: 0, denKm: 100000, l_km: 0.30, ghiChu: 'Tiêu chuẩn cho xe mới, không hàng', createdAt: '2023-01-01T08:05:00Z', updatedAt: '2024-05-01T08:05:00Z' },
  { id: 'dm003', bienSoXe: '51C-67890', phan_loai: 'km_hang', tuKm: 0, denKm: 150000, l_km: 0.38, ghiChu: 'Xe chạy đường dài, có hàng', createdAt: '2023-02-10T09:00:00Z', updatedAt: '2024-04-15T09:00:00Z' },
  { id: 'dm004', bienSoXe: '51C-67890', phan_loai: 'km_vo', tuKm: 0, denKm: 150000, l_km: 0.32, ghiChu: 'Xe chạy đường dài, không hàng', createdAt: '2023-02-10T09:05:00Z', updatedAt: '2024-04-15T09:05:00Z' },
  { id: 'dm005', bienSoXe: '29H-11223', phan_loai: 'km_hang', tuKm: 50000, denKm: 200000, l_km: 0.36, ghiChu: 'Xe đời cũ hơn, có hàng', createdAt: '2023-03-15T10:00:00Z', updatedAt: '2024-05-10T10:00:00Z' },
  { id: 'dm006', bienSoXe: '29H-11223', phan_loai: 'km_vo', tuKm: 50000, denKm: 200000, l_km: 0.31, ghiChu: 'Xe đời cũ hơn, không hàng', createdAt: '2023-03-15T10:05:00Z', updatedAt: '2024-05-10T10:05:00Z' },
  { id: 'dm007', bienSoXe: '72C-00112', phan_loai: 'km_hang', tuKm: 0, denKm: 80000, l_km: 0.40, ghiChu: 'Xe chuyên chở nặng', createdAt: '2023-04-01T11:00:00Z', updatedAt: '2024-05-12T11:00:00Z' },
  { id: 'dm008', bienSoXe: '72C-00112', phan_loai: 'km_vo', tuKm: 0, denKm: 80000, l_km: 0.33, ghiChu: 'Xe chuyên chở nặng, không hàng', createdAt: '2023-04-01T11:05:00Z', updatedAt: '2024-05-12T11:05:00Z' },
  { id: 'dm009', bienSoXe: '60C-55555', phan_loai: 'km_hang', tuKm: 10000, denKm: 120000, l_km: 0.37, ghiChu: 'Xe tải trung, có hàng', createdAt: '2023-05-20T14:00:00Z', updatedAt: '2024-05-20T14:00:00Z' },
  { id: 'dm010', bienSoXe: '60C-55555', phan_loai: 'km_vo', tuKm: 10000, denKm: 120000, l_km: 0.29, ghiChu: 'Xe tải trung, không hàng', createdAt: '2023-05-20T14:05:00Z', updatedAt: '2024-05-20T14:05:00Z' },
  { id: 'dm011', bienSoXe: '51C-12345', phan_loai: 'km_hang', tuKm: 100001, denKm: 200000, l_km: 0.39, ghiChu: 'Sau bảo dưỡng 100k km, có hàng', createdAt: '2023-06-10T08:00:00Z', updatedAt: '2024-05-01T08:30:00Z' },
  { id: 'dm012', bienSoXe: '51C-12345', phan_loai: 'km_vo', tuKm: 100001, denKm: 200000, l_km: 0.32, ghiChu: 'Sau bảo dưỡng 100k km, không hàng', createdAt: '2023-06-10T08:05:00Z', updatedAt: '2024-05-01T08:35:00Z' },
  { id: 'dm013', bienSoXe: '51C-67890', phan_loai: 'km_hang', tuKm: 150001, denKm: 300000, l_km: 0.42, ghiChu: 'Sau bảo dưỡng 150k km, có hàng', createdAt: '2023-07-15T09:00:00Z', updatedAt: '2024-04-15T09:30:00Z' },
  { id: 'dm014', bienSoXe: '29H-11223', phan_loai: 'km_hang', tuKm: 200001, denKm: 400000, l_km: 0.40, ghiChu: 'Sau bảo dưỡng 200k km, có hàng', createdAt: '2023-08-20T10:00:00Z', updatedAt: '2024-05-10T10:30:00Z' },
  { id: 'dm015', bienSoXe: '72C-00112', phan_loai: 'km_vo', tuKm: 80001, denKm: 160000, l_km: 0.35, ghiChu: 'Sau bảo dưỡng 80k km, không hàng', createdAt: '2023-09-01T11:00:00Z', updatedAt: '2024-05-12T11:30:00Z' }
];

let nextDinhMucIndex = 16; // For generating new string IDs like 'dm016'

const PHAN_LOAI_TYPES = ['km_hang', 'km_vo'];

export const getAllDinhMuc = async () => {
  return [...dinhMucData];
};

export const getDinhMucById = async (id) => {
  return dinhMucData.find(dm => dm.id === id) || null;
};

export const createDinhMuc = async (data) => {
  const { bienSoXe, phan_loai, tuKm, denKm, l_km, ghiChu } = data;
  if (!bienSoXe || !phan_loai || tuKm === undefined || denKm === undefined || l_km === undefined) {
    console.error("Missing required fields for new DinhMuc:", data);
    return null; 
  }
  if (!PHAN_LOAI_TYPES.includes(phan_loai)) {
    console.error("Invalid phan_loai for new DinhMuc:", phan_loai);
    return null;
  }

  const newDinhMuc = {
    id: `dm${String(nextDinhMucIndex++).padStart(3, '0')}`,
    bienSoXe,
    phan_loai,
    tuKm: Number(tuKm),
    denKm: Number(denKm),
    l_km: Number(l_km),
    ghiChu: ghiChu || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dinhMucData.push(newDinhMuc);
  return newDinhMuc;
};

export const updateDinhMuc = async (id, updates) => {
  const index = dinhMucData.findIndex(dm => dm.id === id);
  if (index === -1) return null;
  
  const { id: _, createdAt: __, ...validUpdates } = updates;

  if (validUpdates.phan_loai && !PHAN_LOAI_TYPES.includes(validUpdates.phan_loai)) {
    console.error("Invalid phan_loai for DinhMuc update:", validUpdates.phan_loai);
    return null;
  }
  
  const updatedDinhMuc = { ...dinhMucData[index] };

  if (validUpdates.bienSoXe !== undefined) updatedDinhMuc.bienSoXe = validUpdates.bienSoXe;
  if (validUpdates.phan_loai !== undefined) updatedDinhMuc.phan_loai = validUpdates.phan_loai;
  if (validUpdates.tuKm !== undefined) updatedDinhMuc.tuKm = Number(validUpdates.tuKm);
  if (validUpdates.denKm !== undefined) updatedDinhMuc.denKm = Number(validUpdates.denKm);
  if (validUpdates.l_km !== undefined) updatedDinhMuc.l_km = Number(validUpdates.l_km);
  if (validUpdates.ghiChu !== undefined) updatedDinhMuc.ghiChu = validUpdates.ghiChu;
  
  updatedDinhMuc.updatedAt = new Date().toISOString();
  dinhMucData[index] = updatedDinhMuc;
  return dinhMucData[index];
};

export const deleteDinhMuc = async (id) => {
  const index = dinhMucData.findIndex(dm => dm.id === id);
  if (index === -1) return false;
  dinhMucData.splice(index, 1);
  return true;
};

export const _resetDinhMuc = (data = []) => {
  dinhMucData = data.map((item, index) => ({
    ...item,
    id: item.id || `dm${String(index + 1).padStart(3, '0')}`,
  }));
  nextDinhMucIndex = dinhMucData.length > 0 
    ? Math.max(...dinhMucData.map(dm => parseInt(dm.id.replace('dm',''), 10))) + 1 
    : 1;
  if (isNaN(nextDinhMucIndex)) nextDinhMucIndex = dinhMucData.length + 1;
};

if (dinhMucData.length > 0) {
    const maxIdNum = Math.max(...dinhMucData.map(dm => parseInt(dm.id.replace('dm',''), 10)).filter(num => !isNaN(num)));
    nextDinhMucIndex = isFinite(maxIdNum) ? maxIdNum + 1 : dinhMucData.length + 1;
} else {
    nextDinhMucIndex = 1;
}
