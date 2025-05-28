// Mock database for LichVanChuyen (Transport Schedules)
// Fields: id, ma_chuyen, ngay_van_chuyen, trang_thai, khach_hang_id, diem_xuat_phat, diem_tra_hang,
//         bien_so_xe_id, container_id, nhan_vien_giao_nhan_id, nhan_vien_lai_xe_id, ghi_chu, createdAt, updatedAt

import { v4 as _uuidv4 } from 'uuid'; // For generating unique IDs (unused currently)

const TRANG_THAI_LICH_VAN_CHUYEN = {
  TAM_THOI: 'tam_thoi',        // Temporary
  LEN_LICH: 'len_lich',        // Scheduled
  DANG_CHAY: 'dang_chay',       // In transit / Running
  HOAN_THANH: 'hoan_thanh',    // Completed
  HUY_BO: 'huy_bo',           // Cancelled
};

let lichVanChuyenData = [];

const generateSampleLichVanChuyen = (count = 15) => {
  const samples = [];
  const baseDate = new Date(2024, 4, 20); // May 20, 2024

  for (let i = 1; i <= count; i++) {
    const ngayVanChuyen = new Date(baseDate);
    ngayVanChuyen.setDate(baseDate.getDate() + i - 1); // Increment day for variety

    const trangThaiValues = Object.values(TRANG_THAI_LICH_VAN_CHUYEN);
    const trang_thai = trangThaiValues[i % trangThaiValues.length];

    const newRecord = {
      id: `LVC${String(i).padStart(5, '0')}`, // e.g., LVC00001
      ma_chuyen: `CH${String(i).padStart(5, '0')}`, // e.g., CH00001
      ngay_van_chuyen: ngayVanChuyen.toISOString().split('T')[0], // YYYY-MM-DD
      trang_thai,
      khach_hang_id: `KH${String((i % 5) + 1).padStart(3, '0')}`, // KH001 to KH005
      diem_xuat_phat: `Cảng Cát Lái Khu A${(i % 3) + 1}`,
      diem_tra_hang: `KCN Sóng Thần ${(i % 4) + 1}, Bình Dương`,
      bien_so_xe_id: `51C-123${String(i % 10)}${String((i + 1) % 10)}`, // Example, ensure these exist if validating
      container_id: `CSNU68791${String(i % 10)}${String((i + 1) % 10)}${String((i + 2) % 10)}`, // Example, ensure these exist if validating
      nhan_vien_giao_nhan_id: `NVGN${String((i % 2) + 1).padStart(3, '0')}`, // NVGN001, NVGN002
      nhan_vien_lai_xe_id: `NVLX${String((i % 3) + 1).padStart(3, '0')}`, // NVLX001, NVLX002, NVLX003
      ghi_chu:
        trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HUY_BO
          ? 'Lý do hủy: Yêu cầu từ khách hàng'
          : trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.TAM_THOI
            ? 'Chờ xác nhận thông tin container'
            : i % 4 === 0
              ? 'Hàng giá trị cao, yêu cầu bảo hiểm'
              : '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    samples.push(newRecord);
  }
  return samples;
};

lichVanChuyenData = generateSampleLichVanChuyen(15);

export const getAllLichVanChuyen = async () => {
  return [...lichVanChuyenData];
};

export const getLichVanChuyenById = async id => {
  return lichVanChuyenData.find(item => item.id === id) || null;
};

export const getLichVanChuyenByMaChuyen = async maChuyen => {
  return lichVanChuyenData.find(item => item.ma_chuyen === maChuyen) || null;
};

export const createLichVanChuyen = async data => {
  const {
    ma_chuyen,
    ngay_van_chuyen,
    trang_thai,
    khach_hang_id,
    diem_xuat_phat,
    diem_tra_hang,
    bien_so_xe_id,
    container_id,
    nhan_vien_giao_nhan_id,
    nhan_vien_lai_xe_id,
  } = data;

  if (
    !ma_chuyen ||
    !ngay_van_chuyen ||
    !trang_thai ||
    !khach_hang_id ||
    !diem_xuat_phat ||
    !diem_tra_hang ||
    !bien_so_xe_id ||
    !container_id ||
    !nhan_vien_giao_nhan_id ||
    !nhan_vien_lai_xe_id
  ) {
    console.error('Missing required fields for new LichVanChuyen:', data);
    throw new Error('Missing required fields. All fields except ghi_chu are mandatory.');
  }

  if (!Object.values(TRANG_THAI_LICH_VAN_CHUYEN).includes(trang_thai)) {
    console.error('Invalid trang_thai value:', trang_thai);
    throw new Error(
      `Invalid trang_thai value. Must be one of: ${Object.values(TRANG_THAI_LICH_VAN_CHUYEN).join(', ')}`
    );
  }

  if (lichVanChuyenData.some(item => item.ma_chuyen === ma_chuyen)) {
    console.error('LichVanChuyen with this ma_chuyen already exists:', ma_chuyen);
    throw new Error('Mã chuyến đã tồn tại.');
  }

  const newLichVanChuyen = {
    id: `LVC${String(lichVanChuyenData.length + 1).padStart(5, '0')}`, // Simple incrementing ID for mock
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lichVanChuyenData.push(newLichVanChuyen);
  return newLichVanChuyen;
};

export const updateLichVanChuyen = async (id, updates) => {
  const index = lichVanChuyenData.findIndex(item => item.id === id);
  if (index === -1) return null;

  const { id: _, ma_chuyen: new_ma_chuyen, createdAt: __, ...validUpdates } = updates;

  if (new_ma_chuyen && new_ma_chuyen !== lichVanChuyenData[index].ma_chuyen) {
    if (lichVanChuyenData.some(item => item.ma_chuyen === new_ma_chuyen && item.id !== id)) {
      console.error('Another LichVanChuyen with this ma_chuyen already exists:', new_ma_chuyen);
      throw new Error('Mã chuyến đã tồn tại ở một lịch vận chuyển khác.');
    }
  }

  if (
    validUpdates.trang_thai &&
    !Object.values(TRANG_THAI_LICH_VAN_CHUYEN).includes(validUpdates.trang_thai)
  ) {
    console.error('Invalid trang_thai value for update:', validUpdates.trang_thai);
    throw new Error(
      `Invalid trang_thai value. Must be one of: ${Object.values(TRANG_THAI_LICH_VAN_CHUYEN).join(', ')}`
    );
  }

  lichVanChuyenData[index] = {
    ...lichVanChuyenData[index],
    ...validUpdates,
    ma_chuyen: new_ma_chuyen || lichVanChuyenData[index].ma_chuyen, // Update ma_chuyen if provided and valid
    updatedAt: new Date().toISOString(),
  };
  return lichVanChuyenData[index];
};

export const deleteLichVanChuyen = async id => {
  const index = lichVanChuyenData.findIndex(item => item.id === id);
  if (index === -1) return false;
  lichVanChuyenData.splice(index, 1);
  return true;
};

export const _resetLichVanChuyen = (data = []) => {
  if (data.length > 0) {
    lichVanChuyenData = data.map((item, idx) => ({
      ...item,
      id: item.id || `LVC${String(idx + 1).padStart(5, '0')}`,
      ma_chuyen: item.ma_chuyen || `CH${String(idx + 1).padStart(5, '0')}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }));
  } else {
    lichVanChuyenData = generateSampleLichVanChuyen(15);
  }
  // Add duplicate ma_chuyen check after reset if necessary
  const currentMaChuyen = lichVanChuyenData.map(c => c.ma_chuyen);
  const postResetDuplicateMaChuyen = currentMaChuyen.filter(
    (item, index) => currentMaChuyen.indexOf(item) !== index
  );
  if (postResetDuplicateMaChuyen.length > 0) {
    console.error(
      'CRITICAL: Duplicate ma_chuyen found after _resetLichVanChuyen:',
      postResetDuplicateMaChuyen
    );
  }
};

// Initial check for duplicate ma_chuyen in the seed data
const initialMaChuyen = lichVanChuyenData.map(c => c.ma_chuyen);
const duplicateMaChuyen = initialMaChuyen.filter(
  (item, index) => initialMaChuyen.indexOf(item) !== index
);
if (duplicateMaChuyen.length > 0) {
  console.error(
    'CRITICAL: Duplicate ma_chuyen found in initial lichVanChuyenData:',
    duplicateMaChuyen
  );
}

console.log('LichVanChuyen Mock Data Service Initialized with sample data.');
