// Mock database for LichVanChuyen (Transport Schedules)
// Schema based on USER's new definition

export const TRANG_THAI_LICH_VAN_CHUYEN = {
  CHUA_BAT_DAU: 'chua_bat_dau',
  DANG_THUC_HIEN: 'dang_thuc_hien',
  HOAN_THANH: 'hoan_thanh',
  HUY_BO: 'huy_bo',
};

let lichVanChuyenData = [];
let nextLichVanChuyenId = 1;

/**
 * Generate sample transport schedule data based on the new schema.
 * @param {number} count - Number of sample records to generate.
 * @param {Array} phuongTienIds - Array of available PhuongTien IDs.
 * @param {Array} taiXeIds - Array of available TaiXe (NhanVien) IDs.
 * @param {Array} containerIds - Array of available Container IDs.
 * @returns {Array} Array of sample transport schedule records.
 */
const generateSampleLichVanChuyen = (
  count = 10,
  phuongTienIds = [1, 2],
  taiXeIds = [4, 5],
  containerIds = [1, 2, 3, 4, 5]
) => {
  const samples = [];
  const baseDateTime = new Date('2024-06-01T00:00:00Z');
  const now = new Date().toISOString();

  for (let i = 1; i <= count; i++) {
    const startOffsetHours = i * 2;
    const thoi_gian_bat_dau_ke_hoach_dt = new Date(
      baseDateTime.getTime() + startOffsetHours * 60 * 60 * 1000
    );
    const thoi_gian_ket_thuc_ke_hoach_dt = new Date(
      thoi_gian_bat_dau_ke_hoach_dt.getTime() + (8 + (i % 4)) * 60 * 60 * 1000
    );

    const trangThaiValues = Object.values(TRANG_THAI_LICH_VAN_CHUYEN);
    const trang_thai = trangThaiValues[i % trangThaiValues.length];

    let thoi_gian_bat_dau_thuc_te = null;
    let thoi_gian_ket_thuc_thuc_te = null;

    if (
      trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.DANG_THUC_HIEN ||
      trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH
    ) {
      thoi_gian_bat_dau_thuc_te = new Date(
        thoi_gian_bat_dau_ke_hoach_dt.getTime() - (i % 30) * 60 * 1000
      ).toISOString(); // Start a bit early/late
    }
    if (trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH) {
      thoi_gian_ket_thuc_thuc_te = new Date(
        thoi_gian_ket_thuc_ke_hoach_dt.getTime() + (i % 60) * 60 * 1000
      ).toISOString(); // End a bit early/late
    }

    samples.push({
      id: nextLichVanChuyenId++,
      ma_chuyen_xe: `CX${String(i).padStart(3, '0')}`,
      thoi_gian_bat_dau_ke_hoach: thoi_gian_bat_dau_ke_hoach_dt.toISOString(),
      thoi_gian_ket_thuc_ke_hoach: thoi_gian_ket_thuc_ke_hoach_dt.toISOString(),
      thoi_gian_bat_dau_thuc_te,
      thoi_gian_ket_thuc_thuc_te,
      trang_thai,
      diem_xuat_phat: i % 2 === 0 ? 'Kho A, TP.HCM' : 'Kho B, Bình Dương',
      diem_den: i % 2 === 0 ? 'Cảng Cát Lái, TP.HCM' : 'KCN Sóng Thần, Bình Dương',
      ghi_chu:
        trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HUY_BO
          ? 'Hủy do thay đổi kế hoạch.'
          : `Chuyến vận chuyển ${i}.`,
      id_phuong_tien: phuongTienIds[i % phuongTienIds.length],
      id_tai_xe_chinh: taiXeIds[i % taiXeIds.length],
      id_tai_xe_phu:
        i % 3 === 0 && taiXeIds.length > 1 ? taiXeIds[(i + 1) % taiXeIds.length] : null, // Assign co-driver sometimes if available
      id_container_1:
        i % 2 !== 0 && containerIds.length > 0 ? containerIds[i % containerIds.length] : null,
      id_container_2:
        i % 4 === 0 && containerIds.length > 1 ? containerIds[(i + 1) % containerIds.length] : null,
      createdAt: now,
      updatedAt: now,
    });
  }
  return samples;
};

// Initialize data (assuming some IDs from other mock data for FKs)
// These IDs should ideally be fetched or coordinated from dauKeo.js, nhanVien.js, container.js
lichVanChuyenData = generateSampleLichVanChuyen(15, [1, 2, 3], [4, 5, 8], [1, 2, 3, 4, 5]);

export const getAllLichVanChuyen = async () => {
  return [...lichVanChuyenData];
};

export const getLichVanChuyenById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return lichVanChuyenData.find(item => item.id === numericId) || null;
};

export const getLichVanChuyenByMaChuyenXe = async maChuyenXe => {
  return lichVanChuyenData.find(item => item.ma_chuyen_xe === maChuyenXe) || null;
};

export const createLichVanChuyen = async data => {
  const { ma_chuyen_xe, thoi_gian_bat_dau_ke_hoach, id_phuong_tien, id_tai_xe_chinh } = data;
  if (!ma_chuyen_xe || !thoi_gian_bat_dau_ke_hoach || !id_phuong_tien || !id_tai_xe_chinh) {
    throw new Error(
      'Mã chuyến xe, thời gian bắt đầu kế hoạch, ID phương tiện, ID tài xế chính là bắt buộc.'
    );
  }

  if (lichVanChuyenData.some(item => item.ma_chuyen_xe === ma_chuyen_xe)) {
    throw new Error('Mã chuyến xe đã tồn tại.');
  }

  if (data.trang_thai && !Object.values(TRANG_THAI_LICH_VAN_CHUYEN).includes(data.trang_thai)) {
    throw new Error(
      `Trạng thái không hợp lệ. Phải là một trong: ${Object.values(TRANG_THAI_LICH_VAN_CHUYEN).join(', ')}`
    );
  }

  const now = new Date().toISOString();
  const newRecord = {
    id: nextLichVanChuyenId++,
    ma_chuyen_xe,
    thoi_gian_bat_dau_ke_hoach,
    thoi_gian_ket_thuc_ke_hoach: data.thoi_gian_ket_thuc_ke_hoach || null,
    thoi_gian_bat_dau_thuc_te: data.thoi_gian_bat_dau_thuc_te || null,
    thoi_gian_ket_thuc_thuc_te: data.thoi_gian_ket_thuc_thuc_te || null,
    trang_thai: data.trang_thai || TRANG_THAI_LICH_VAN_CHUYEN.CHUA_BAT_DAU,
    diem_xuat_phat: data.diem_xuat_phat || '',
    diem_den: data.diem_den || '',
    ghi_chu: data.ghi_chu || '',
    id_phuong_tien,
    id_tai_xe_chinh,
    id_tai_xe_phu: data.id_tai_xe_phu || null,
    id_container_1: data.id_container_1 || null,
    id_container_2: data.id_container_2 || null,
    createdAt: now,
    updatedAt: now,
  };

  lichVanChuyenData.push(newRecord);
  return newRecord;
};

export const updateLichVanChuyen = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = lichVanChuyenData.findIndex(item => item.id === numericId);
  if (index === -1) return null;

  const { ma_chuyen_xe: newMaChuyenXe } = updates;
  if (
    newMaChuyenXe &&
    lichVanChuyenData.some(item => item.ma_chuyen_xe === newMaChuyenXe && item.id !== numericId)
  ) {
    throw new Error('Mã chuyến xe đã tồn tại cho một lịch khác.');
  }

  if (
    updates.trang_thai &&
    !Object.values(TRANG_THAI_LICH_VAN_CHUYEN).includes(updates.trang_thai)
  ) {
    throw new Error(
      `Trạng thái không hợp lệ. Phải là một trong: ${Object.values(TRANG_THAI_LICH_VAN_CHUYEN).join(', ')}`
    );
  }

  const updatedRecord = {
    ...lichVanChuyenData[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  lichVanChuyenData[index] = updatedRecord;
  return updatedRecord;
};

export const deleteLichVanChuyen = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = lichVanChuyenData.findIndex(item => item.id === numericId);
  if (index === -1) return false;
  lichVanChuyenData.splice(index, 1);
  return true;
};

export const _resetLichVanChuyen = (
  data = [],
  phuongTienIds = [1, 2, 3],
  taiXeIds = [4, 5, 8],
  containerIds = [1, 2, 3, 4, 5]
) => {
  lichVanChuyenData = [];
  nextLichVanChuyenId = 1;
  if (data && data.length > 0) {
    // If specific data is provided, use it directly, ensuring IDs are managed
    data.forEach(item => {
      const newItem = { ...item };
      if (!newItem.id || lichVanChuyenData.some(lvc => lvc.id === newItem.id)) {
        newItem.id = nextLichVanChuyenId++;
      } else {
        if (newItem.id >= nextLichVanChuyenId) nextLichVanChuyenId = newItem.id + 1;
      }
      lichVanChuyenData.push(newItem);
    });
  } else {
    // Otherwise, generate sample data
    lichVanChuyenData = generateSampleLichVanChuyen(15, phuongTienIds, taiXeIds, containerIds);
  }
  // Ensure nextId is correctly set after any manual data load
  if (lichVanChuyenData.length > 0) {
    nextLichVanChuyenId = Math.max(...lichVanChuyenData.map(item => item.id)) + 1;
  } else {
    nextLichVanChuyenId = 1;
  }
  return [...lichVanChuyenData];
};

// Initial check for duplicate ma_chuyen_xe in seed data
const initialMaChuyenXe = lichVanChuyenData.map(c => c.ma_chuyen_xe);
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
