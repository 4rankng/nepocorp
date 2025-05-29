// Mock database for LichVanChuyen (Transport Schedules)
// Schema based on USER's new definition

export const TRANG_THAI_LICH_VAN_CHUYEN = {
  CHUA_BAT_DAU: 'chua_bat_dau',
  DANG_THUC_HIEN: 'dang_thuc_hien',
  HOAN_THANH: 'hoan_thanh',
  HUY_BO: 'huy_bo',
};

let lichVanChuyenData = [
  {
    id: 1,
    ma_chuyen: 'MC001',
    ngay_di: '2024-05-28',
    ngay_ha_hang: '2024-05-28',
    trang_thai: 'len_lich',
    ma_khach_hang: 'KH001',
    diem_di: 'Kho Nepocorp, Hà Nội',
    diem_den: 'Cảng Hải Phòng; Cảng Quảng Ninh',
    cuoc_van_chuyen_vnd: 1222333,
    cuoc_thue_van_chuyen_vnd: 1000333,
    bien_so_dau_keo: '15C-11223',
    ma_so_cont: '20DC',
    ma_nv_giao_nhan: 'NV003',
    ma_nv_lai_xe: 'NV004',
    ghi_chu: 'Hàng dễ vỡ, xin nhẹ tay.',
    km_hang: 50.12,
    km_vo: 23.34,
    l_dau: 2.96,
    vnd_dau: 5123001,
    vnd_di_duong: 1222333,
    vnd_chi_phi: 6345334,
    createdAt: '2024-05-27T10:00:00Z',
    updatedAt: '2024-05-27T10:00:00Z',
  },
  {
    id: 2,
    ma_chuyen: 'MC002',
    ngay_di: '2024-05-29',
    ngay_ha_hang: '2024-05-29',
    trang_thai: 'hoan_thanh',
    ma_khach_hang: 'KH002',
    diem_di: 'Kho Nepocorp, Hải Phòng',
    diem_den: 'Cảng Đà Nẵng',
    cuoc_van_chuyen_vnd: 2000000,
    cuoc_thue_van_chuyen_vnd: 1500000,
    bien_so_dau_keo: '16C-22334',
    ma_so_cont: '40HC',
    ma_nv_giao_nhan: 'NV005',
    ma_nv_lai_xe: 'NV006',
    ghi_chu: 'Giao hàng trước 12h.',
    km_hang: 120.5,
    km_vo: 60.0,
    l_dau: 5.5,
    vnd_dau: 800000,
    vnd_di_duong: 2000000,
    vnd_chi_phi: 2800000,
    createdAt: '2024-05-28T09:00:00Z',
    updatedAt: '2024-05-28T09:00:00Z',
  },
  {
    id: 3,
    ma_chuyen: 'MC003',
    ngay_di: '2024-05-30',
    ngay_ha_hang: '2024-05-31',
    trang_thai: 'huy_bo',
    ma_khach_hang: 'KH003',
    diem_di: 'Kho Nepocorp, Đà Nẵng',
    diem_den: 'Cảng Sài Gòn',
    cuoc_van_chuyen_vnd: 3000000,
    cuoc_thue_van_chuyen_vnd: 2500000,
    bien_so_dau_keo: '17C-33445',
    ma_so_cont: '45RF',
    ma_nv_giao_nhan: 'NV007',
    ma_nv_lai_xe: 'NV008',
    ghi_chu: 'Khách hủy chuyến.',
    km_hang: 200.0,
    km_vo: 100.0,
    l_dau: 10.0,
    vnd_dau: 1200000,
    vnd_di_duong: 3000000,
    vnd_chi_phi: 4200000,
    createdAt: '2024-05-29T08:00:00Z',
    updatedAt: '2024-05-29T08:00:00Z',
  },
];
let nextLichVanChuyenId = 4;

/**
 * @returns {Promise<Array<any>>}
 */
export const getAllLichVanChuyen = async () => {
  return [...lichVanChuyenData];
};

/**
 * @param {number|string} id
 * @returns {Promise<any|null>}
 */
export const getLichVanChuyenById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return lichVanChuyenData.find(item => item.id === numericId) || null;
};

/**
 * @param {string} maChuyenXe
 * @returns {Promise<any|null>}
 */
export const getLichVanChuyenByMaChuyenXe = async maChuyenXe => {
  return lichVanChuyenData.find(item => item.ma_chuyen === maChuyenXe) || null;
};

/**
 * @param {object} data
 * @returns {Promise<any>}
 */
export const createLichVanChuyen = async data => {
  const now = new Date().toISOString();
  const newRecord = {
    ...data,
    id: nextLichVanChuyenId++,
    createdAt: now,
    updatedAt: now,
  };
  lichVanChuyenData.push(newRecord);
  return newRecord;
};

/**
 * @param {number|string} id
 * @param {object} updates
 * @returns {Promise<any|null>}
 */
export const updateLichVanChuyen = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = lichVanChuyenData.findIndex(item => item.id === numericId);
  if (index === -1) return null;
  lichVanChuyenData[index] = {
    ...lichVanChuyenData[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  return lichVanChuyenData[index];
};

/**
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
export const deleteLichVanChuyen = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = lichVanChuyenData.findIndex(item => item.id === numericId);
  if (index === -1) return false;
  lichVanChuyenData.splice(index, 1);
  return true;
};

/**
 * @param {Array<any>} data
 * @returns {Promise<Array<any>>}
 */
export const _resetLichVanChuyen = async (data = []) => {
  if (!data || data.length === 0) {
    lichVanChuyenData = [];
    nextLichVanChuyenId = 1;
    return [];
  }
  const requiredFields = [
    'ma_chuyen',
    'ngay_di',
    'ngay_ha_hang',
    'trang_thai',
    'ma_khach_hang',
    'diem_di',
    'diem_den',
    'cuoc_van_chuyen_vnd',
    'cuoc_thue_van_chuyen_vnd',
    'bien_so_dau_keo',
    'ma_so_cont',
    'ma_nv_giao_nhan',
    'ma_nv_lai_xe',
    'ghi_chu',
    'km_hang',
    'km_vo',
    'l_dau',
    'vnd_dau',
    'vnd_di_duong',
    'vnd_chi_phi',
    'createdAt',
    'updatedAt',
  ];
  const defaultValues = {
    ma_chuyen: '',
    ngay_di: '',
    ngay_ha_hang: '',
    trang_thai: '',
    ma_khach_hang: '',
    diem_di: '',
    diem_den: '',
    cuoc_van_chuyen_vnd: 0,
    cuoc_thue_van_chuyen_vnd: 0,
    bien_so_dau_keo: '',
    ma_so_cont: '',
    ma_nv_giao_nhan: '',
    ma_nv_lai_xe: '',
    ghi_chu: '',
    km_hang: 0,
    km_vo: 0,
    l_dau: 0,
    vnd_dau: 0,
    vnd_di_duong: 0,
    vnd_chi_phi: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lichVanChuyenData = data.map((item, idx) => {
    const filled = { ...defaultValues, ...item, id: idx + 1 };
    return filled;
  });
  nextLichVanChuyenId = lichVanChuyenData.length + 1;
  return [...lichVanChuyenData];
};

// Initial check for duplicate ma_chuyen_xe in seed data
const initialMaChuyenXe = lichVanChuyenData.map(c => c.ma_chuyen);
const duplicateMaChuyenXe = initialMaChuyenXe.filter(
  (item, index) => initialMaChuyenXe.indexOf(item) !== index
);
if (duplicateMaChuyenXe.length > 0) {
  console.error(
    'CRITICAL: Duplicate ma_chuyen_xe found in initial lichVanChuyenData:',
    duplicateMaChuyenXe
  );
}

// Initial check for duplicate IDs in seed data
const initialIds = lichVanChuyenData.map(c => c.id);
const duplicateIds = initialIds.filter((item, index) => initialIds.indexOf(item) !== index);
if (duplicateIds.length > 0) {
  console.error('CRITICAL: Duplicate IDs found in initial lichVanChuyenData:', duplicateIds);
}
