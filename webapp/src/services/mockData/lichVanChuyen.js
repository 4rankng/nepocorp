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
    ngay_ha_hang: null, // Status is 'len_lich', not completed
    trang_thai: 'tam_thoi',
    ma_khach_hang: 'MDD001',
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
    ngay_ha_hang: '2024-05-29', // Status is 'hoan_thanh', completed
    trang_thai: 'hoan_thanh',
    ma_khach_hang: 'MDD002',
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
    ngay_ha_hang: null, // Status is 'huy_bo', cancelled
    trang_thai: 'huy_bo',
    ma_khach_hang: 'MDD003',
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
  {
    id: 4,
    ma_chuyen: 'MC004',
    ngay_di: '2024-06-01',
    ngay_ha_hang: null,
    trang_thai: 'dang_chay',
    ma_khach_hang: 'MDD004',
    diem_di: 'Kho Nepocorp, Cần Thơ',
    diem_den: 'Cảng Vũng Tàu',
    cuoc_van_chuyen_vnd: 2500000,
    cuoc_thue_van_chuyen_vnd: 2000000,
    bien_so_dau_keo: '18C-44556',
    ma_so_cont: '20DC',
    ma_nv_giao_nhan: 'NV009',
    ma_nv_lai_xe: 'NV010',
    ghi_chu: 'Chuyến hàng ưu tiên.',
    km_hang: 180.0,
    km_vo: 90.0,
    l_dau: 8.0,
    vnd_dau: 1500000,
    vnd_di_duong: 2500000,
    vnd_chi_phi: 4000000,
    createdAt: '2024-05-31T08:00:00Z',
    updatedAt: '2024-05-31T08:00:00Z',
  },
  {
    id: 5,
    ma_chuyen: 'MC005',
    ngay_di: '2024-06-02',
    ngay_ha_hang: '2024-06-02',
    trang_thai: 'hoan_thanh',
    ma_khach_hang: 'MDD005',
    diem_di: 'Kho Nepocorp, Hải Dương',
    diem_den: 'Cảng Cát Lái',
    cuoc_van_chuyen_vnd: 1800000,
    cuoc_thue_van_chuyen_vnd: 1400000,
    bien_so_dau_keo: '19C-55667',
    ma_so_cont: '40HC',
    ma_nv_giao_nhan: 'NV011',
    ma_nv_lai_xe: 'NV012',
    ghi_chu: 'Giao hàng đúng giờ.',
    km_hang: 100.0,
    km_vo: 50.0,
    l_dau: 4.5,
    vnd_dau: 900000,
    vnd_di_duong: 1800000,
    vnd_chi_phi: 2700000,
    createdAt: '2024-06-01T09:00:00Z',
    updatedAt: '2024-06-01T09:00:00Z',
  },
  {
    id: 6,
    ma_chuyen: 'MC006',
    ngay_di: '2024-06-03',
    ngay_ha_hang: null,
    trang_thai: 'huy_bo',
    ma_khach_hang: 'MDD006',
    diem_di: 'Kho Nepocorp, Quảng Ninh',
    diem_den: 'Cảng Quy Nhơn',
    cuoc_van_chuyen_vnd: 2200000,
    cuoc_thue_van_chuyen_vnd: 1800000,
    bien_so_dau_keo: '20C-66778',
    ma_so_cont: '45RF',
    ma_nv_giao_nhan: 'NV013',
    ma_nv_lai_xe: 'NV014',
    ghi_chu: 'Khách hủy chuyến do thời tiết.',
    km_hang: 210.0,
    km_vo: 110.0,
    l_dau: 11.0,
    vnd_dau: 1300000,
    vnd_di_duong: 2200000,
    vnd_chi_phi: 3500000,
    createdAt: '2024-06-02T10:00:00Z',
    updatedAt: '2024-06-02T10:00:00Z',
  },
  {
    id: 7,
    ma_chuyen: 'MC007',
    ngay_di: '2024-06-04',
    ngay_ha_hang: null,
    trang_thai: 'len_lich',
    ma_khach_hang: 'MDD007',
    diem_di: 'Kho Nepocorp, Bắc Ninh',
    diem_den: 'Cảng Hải Phòng',
    cuoc_van_chuyen_vnd: 1600000,
    cuoc_thue_van_chuyen_vnd: 1200000,
    bien_so_dau_keo: '21C-77889',
    ma_so_cont: '20DC',
    ma_nv_giao_nhan: 'NV015',
    ma_nv_lai_xe: 'NV016',
    ghi_chu: 'Chờ xác nhận khách hàng.',
    km_hang: 60.0,
    km_vo: 30.0,
    l_dau: 3.0,
    vnd_dau: 700000,
    vnd_di_duong: 1600000,
    vnd_chi_phi: 2300000,
    createdAt: '2024-06-03T11:00:00Z',
    updatedAt: '2024-06-03T11:00:00Z',
  },
  {
    id: 8,
    ma_chuyen: 'MC008',
    ngay_di: '2024-06-05',
    ngay_ha_hang: '2024-06-05',
    trang_thai: 'hoan_thanh',
    ma_khach_hang: 'MDD008',
    diem_di: 'Kho Nepocorp, Hà Nam',
    diem_den: 'Cảng Đình Vũ',
    cuoc_van_chuyen_vnd: 2100000,
    cuoc_thue_van_chuyen_vnd: 1700000,
    bien_so_dau_keo: '22C-88990',
    ma_so_cont: '40HC',
    ma_nv_giao_nhan: 'NV017',
    ma_nv_lai_xe: 'NV018',
    ghi_chu: 'Không có sự cố.',
    km_hang: 130.0,
    km_vo: 65.0,
    l_dau: 6.0,
    vnd_dau: 1100000,
    vnd_di_duong: 2100000,
    vnd_chi_phi: 3200000,
    createdAt: '2024-06-04T12:00:00Z',
    updatedAt: '2024-06-04T12:00:00Z',
  },
  {
    id: 9,
    ma_chuyen: 'MC009',
    ngay_di: '2024-06-06',
    ngay_ha_hang: null,
    trang_thai: 'dang_chay',
    ma_khach_hang: 'MDD009',
    diem_di: 'Kho Nepocorp, Thái Bình',
    diem_den: 'Cảng Sài Gòn',
    cuoc_van_chuyen_vnd: 2700000,
    cuoc_thue_van_chuyen_vnd: 2300000,
    bien_so_dau_keo: '23C-99001',
    ma_so_cont: '45RF',
    ma_nv_giao_nhan: 'NV019',
    ma_nv_lai_xe: 'NV020',
    ghi_chu: 'Đang vận chuyển.',
    km_hang: 220.0,
    km_vo: 120.0,
    l_dau: 12.0,
    vnd_dau: 1400000,
    vnd_di_duong: 2700000,
    vnd_chi_phi: 4100000,
    createdAt: '2024-06-05T13:00:00Z',
    updatedAt: '2024-06-05T13:00:00Z',
  },
  {
    id: 10,
    ma_chuyen: 'MC010',
    ngay_di: '2024-06-07',
    ngay_ha_hang: null,
    trang_thai: 'len_lich',
    ma_khach_hang: 'MDD010',
    diem_di: 'Kho Nepocorp, Nam Định',
    diem_den: 'Cảng Hải Phòng',
    cuoc_van_chuyen_vnd: 1500000,
    cuoc_thue_van_chuyen_vnd: 1100000,
    bien_so_dau_keo: '24C-10112',
    ma_so_cont: '20DC',
    ma_nv_giao_nhan: 'NV021',
    ma_nv_lai_xe: 'NV022',
    ghi_chu: 'Chưa xác nhận.',
    km_hang: 70.0,
    km_vo: 35.0,
    l_dau: 3.5,
    vnd_dau: 800000,
    vnd_di_duong: 1500000,
    vnd_chi_phi: 2300000,
    createdAt: '2024-06-06T14:00:00Z',
    updatedAt: '2024-06-06T14:00:00Z',
  },
  {
    id: 11,
    ma_chuyen: 'MC011',
    ngay_di: '2024-06-08',
    ngay_ha_hang: '2024-06-08',
    trang_thai: 'hoan_thanh',
    ma_khach_hang: 'MDD011',
    diem_di: 'Kho Nepocorp, Thanh Hóa',
    diem_den: 'Cảng Đà Nẵng',
    cuoc_van_chuyen_vnd: 2300000,
    cuoc_thue_van_chuyen_vnd: 1900000,
    bien_so_dau_keo: '25C-11223',
    ma_so_cont: '40HC',
    ma_nv_giao_nhan: 'NV023',
    ma_nv_lai_xe: 'NV024',
    ghi_chu: 'Giao hàng thành công.',
    km_hang: 140.0,
    km_vo: 70.0,
    l_dau: 7.0,
    vnd_dau: 1200000,
    vnd_di_duong: 2300000,
    vnd_chi_phi: 3500000,
    createdAt: '2024-06-07T15:00:00Z',
    updatedAt: '2024-06-07T15:00:00Z',
  },
  {
    id: 12,
    ma_chuyen: 'MC012',
    ngay_di: '2024-06-09',
    ngay_ha_hang: null,
    trang_thai: 'huy_bo',
    ma_khach_hang: 'MDD012',
    diem_di: 'Kho Nepocorp, Nghệ An',
    diem_den: 'Cảng Quy Nhơn',
    cuoc_van_chuyen_vnd: 2400000,
    cuoc_thue_van_chuyen_vnd: 2000000,
    bien_so_dau_keo: '26C-12334',
    ma_so_cont: '45RF',
    ma_nv_giao_nhan: 'NV025',
    ma_nv_lai_xe: 'NV026',
    ghi_chu: 'Khách hủy chuyến do lý do cá nhân.',
    km_hang: 230.0,
    km_vo: 130.0,
    l_dau: 13.0,
    vnd_dau: 1500000,
    vnd_di_duong: 2400000,
    vnd_chi_phi: 3900000,
    createdAt: '2024-06-08T16:00:00Z',
    updatedAt: '2024-06-08T16:00:00Z',
  },
  {
    id: 13,
    ma_chuyen: 'MC013',
    ngay_di: '2024-06-10',
    ngay_ha_hang: null,
    trang_thai: 'dang_chay',
    ma_khach_hang: 'MDD013',
    diem_di: 'Kho Nepocorp, Quảng Bình',
    diem_den: 'Cảng Sài Gòn',
    cuoc_van_chuyen_vnd: 2600000,
    cuoc_thue_van_chuyen_vnd: 2200000,
    bien_so_dau_keo: '27C-13445',
    ma_so_cont: '20DC',
    ma_nv_giao_nhan: 'NV027',
    ma_nv_lai_xe: 'NV028',
    ghi_chu: 'Đang vận chuyển.',
    km_hang: 240.0,
    km_vo: 140.0,
    l_dau: 14.0,
    vnd_dau: 1600000,
    vnd_di_duong: 2600000,
    vnd_chi_phi: 4200000,
    createdAt: '2024-06-09T17:00:00Z',
    updatedAt: '2024-06-09T17:00:00Z',
  },
  {
    id: 14,
    ma_chuyen: 'MC014',
    ngay_di: '2024-06-11',
    ngay_ha_hang: null,
    trang_thai: 'len_lich',
    ma_khach_hang: 'MDD014',
    diem_di: 'Kho Nepocorp, Huế',
    diem_den: 'Cảng Hải Phòng',
    cuoc_van_chuyen_vnd: 1700000,
    cuoc_thue_van_chuyen_vnd: 1300000,
    bien_so_dau_keo: '28C-14556',
    ma_so_cont: '40HC',
    ma_nv_giao_nhan: 'NV029',
    ma_nv_lai_xe: 'NV030',
    ghi_chu: 'Chưa xác nhận.',
    km_hang: 80.0,
    km_vo: 40.0,
    l_dau: 4.0,
    vnd_dau: 900000,
    vnd_di_duong: 1700000,
    vnd_chi_phi: 2600000,
    createdAt: '2024-06-10T18:00:00Z',
    updatedAt: '2024-06-10T18:00:00Z',
  },
  {
    id: 15,
    ma_chuyen: 'MC015',
    ngay_di: '2024-06-12',
    ngay_ha_hang: '2024-06-12',
    trang_thai: 'hoan_thanh',
    ma_khach_hang: 'MDD015',
    diem_di: 'Kho Nepocorp, Bình Định',
    diem_den: 'Cảng Đà Nẵng',
    cuoc_van_chuyen_vnd: 2200000,
    cuoc_thue_van_chuyen_vnd: 1800000,
    bien_so_dau_keo: '29C-15667',
    ma_so_cont: '45RF',
    ma_nv_giao_nhan: 'NV031',
    ma_nv_lai_xe: 'NV032',
    ghi_chu: 'Giao hàng thành công.',
    km_hang: 150.0,
    km_vo: 75.0,
    l_dau: 7.5,
    vnd_dau: 1300000,
    vnd_di_duong: 2200000,
    vnd_chi_phi: 3500000,
    createdAt: '2024-06-11T19:00:00Z',
    updatedAt: '2024-06-11T19:00:00Z',
  },
  {
    id: 16,
    ma_chuyen: 'MC016',
    ngay_di: '2024-06-13',
    ngay_ha_hang: null,
    trang_thai: 'huy_bo',
    ma_khach_hang: 'MDD011',
    diem_di: 'Kho Nepocorp, Đồng Nai',
    diem_den: 'Cảng Quy Nhơn',
    cuoc_van_chuyen_vnd: 2500000,
    cuoc_thue_van_chuyen_vnd: 2100000,
    bien_so_dau_keo: '30C-16778',
    ma_so_cont: '20DC',
    ma_nv_giao_nhan: 'NV033',
    ma_nv_lai_xe: 'NV034',
    ghi_chu: 'Khách hủy chuyến do lý do cá nhân.',
    km_hang: 250.0,
    km_vo: 150.0,
    l_dau: 15.0,
    vnd_dau: 1700000,
    vnd_di_duong: 2500000,
    vnd_chi_phi: 4200000,
    createdAt: '2024-06-12T20:00:00Z',
    updatedAt: '2024-06-12T20:00:00Z',
  },
  {
    id: 17,
    ma_chuyen: 'MC017',
    ngay_di: '2024-06-14',
    ngay_ha_hang: null,
    trang_thai: 'dang_chay',
    ma_khach_hang: 'MDD012',
    diem_di: 'Kho Nepocorp, Tây Ninh',
    diem_den: 'Cảng Sài Gòn',
    cuoc_van_chuyen_vnd: 2800000,
    cuoc_thue_van_chuyen_vnd: 2400000,
    bien_so_dau_keo: '31C-17889',
    ma_so_cont: '40HC',
    ma_nv_giao_nhan: 'NV035',
    ma_nv_lai_xe: 'NV036',
    ghi_chu: 'Đang vận chuyển.',
    km_hang: 260.0,
    km_vo: 160.0,
    l_dau: 16.0,
    vnd_dau: 1800000,
    vnd_di_duong: 2800000,
    vnd_chi_phi: 4600000,
    createdAt: '2024-06-13T21:00:00Z',
    updatedAt: '2024-06-13T21:00:00Z',
  },
  {
    id: 18,
    ma_chuyen: 'MC018',
    ngay_di: '2024-06-15',
    ngay_ha_hang: null,
    trang_thai: 'len_lich',
    ma_khach_hang: 'MDD008',
    diem_di: 'Kho Nepocorp, Vĩnh Long',
    diem_den: 'Cảng Hải Phòng',
    cuoc_van_chuyen_vnd: 1900000,
    cuoc_thue_van_chuyen_vnd: 1500000,
    bien_so_dau_keo: '32C-18990',
    ma_so_cont: '45RF',
    ma_nv_giao_nhan: 'NV037',
    ma_nv_lai_xe: 'NV038',
    ghi_chu: 'Chưa xác nhận.',
    km_hang: 90.0,
    km_vo: 45.0,
    l_dau: 4.5,
    vnd_dau: 1000000,
    vnd_di_duong: 1900000,
    vnd_chi_phi: 2900000,
    createdAt: '2024-06-14T22:00:00Z',
    updatedAt: '2024-06-14T22:00:00Z',
  },
];
let nextLichVanChuyenId = 19;
// Import khachHangData for ma_dinh_danh values
import { khachHangData } from './khachHang.js';
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
  // Ensure ngay_ha_hang is only set when trang_thai is 'hoan_thanh'
  const processedData = { ...data };
  if (processedData.trang_thai !== TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH) {
    processedData.ngay_ha_hang = null;
  }
  const newRecord = {
    ...processedData,
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
  // Ensure ngay_ha_hang is only set when trang_thai is 'hoan_thanh'
  const processedUpdates = { ...updates };
  const currentRecord = lichVanChuyenData[index];
  const finalTrangThai = processedUpdates.trang_thai || currentRecord.trang_thai;
  if (finalTrangThai !== TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH) {
    processedUpdates.ngay_ha_hang = null;
  }
  lichVanChuyenData[index] = {
    ...lichVanChuyenData[index],
    ...processedUpdates,
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
  const defaultValues = {
    ma_chuyen: '',
    ngay_di: '',
    ngay_ha_hang: null,
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
  // Get all ma_dinh_danh values from khachHangData
  const maDinhDanhList = khachHangData.map(kh => kh.ma_dinh_danh);
  lichVanChuyenData = data.map((item, idx) => {
    const filled = { ...defaultValues, ...item, id: idx + 1 };
    // Ensure ngay_ha_hang is only set when trang_thai is 'hoan_thanh'
    if (filled.trang_thai !== TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH) {
      filled.ngay_ha_hang = null;
    }
    // Always assign a valid ma_khach_hang from maDinhDanhList
    filled.ma_khach_hang = maDinhDanhList[idx % maDinhDanhList.length];
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
}
// Initial check for duplicate IDs in seed data
const initialIds = lichVanChuyenData.map(c => c.id);
const duplicateIds = initialIds.filter((item, index) => initialIds.indexOf(item) !== index);
if (duplicateIds.length > 0) {
}
// Ensure cuoc_van_chuyen_vnd > vnd_chi_phi * 1.2 for all records
lichVanChuyenData = lichVanChuyenData.map(record => {
  if (!(record.cuoc_van_chuyen_vnd > record.vnd_chi_phi * 1.2)) {
    return {
      ...record,
      cuoc_van_chuyen_vnd: Math.ceil(record.vnd_chi_phi * 1.2) + 100000,
    };
  }
  return record;
});
