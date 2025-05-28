// Mock database for LichVanChuyen (Transport Schedules)
// Fields: id, ma_chuyen, ngay_di, ngay_ha_hang, trang_thai, ma_khach_hang, diem_di, diem_den,
//         bien_so_dau_keo, ma_so_cont, ma_nv_giao_nhan, ma_nv_lai_xe, ghi_chu, createdAt, updatedAt

const TRANG_THAI_LICH_VAN_CHUYEN = {
  TAM_THOI: 'tam_thoi', // Temporary
  LEN_LICH: 'len_lich', // Scheduled
  DANG_CHAY: 'dang_chay', // In transit / Running
  HOAN_THANH: 'hoan_thanh', // Completed
  HUY_BO: 'huy_bo', // Cancelled
};

let lichVanChuyenData = [];

/**
 * Generate sample transport schedule data
 * @param {number} count - Number of sample records to generate
 * @returns {Array} Array of sample transport schedule records
 */
const generateSampleLichVanChuyen = (count = 15) => {
  const samples = [];
  const baseDate = new Date(2024, 4, 20);
  const now = new Date();

  for (let i = 1; i <= count; i++) {
    const ngayDi = new Date(baseDate);
    ngayDi.setDate(baseDate.getDate() + i - 1);

    const trangThaiValues = Object.values(TRANG_THAI_LICH_VAN_CHUYEN);
    const trang_thai = trangThaiValues[i % trangThaiValues.length];

    let ngay_ha_hang = '';
    if (trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH) {
      const ngayHaHang = new Date(ngayDi);
      ngayHaHang.setDate(ngayDi.getDate() + (i % 3) + 1);
      ngay_ha_hang = ngayHaHang.toISOString().split('T')[0];
    }

    let ghi_chu = `Hàng dễ vỡ, xin nhẹ tay. Chuyến số ${i}`;
    if (trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HUY_BO) {
      ghi_chu = 'Lý do hủy: Yêu cầu từ khách hàng';
    } else if (trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.TAM_THOI) {
      ghi_chu = 'Chuyến tạm thời, chờ xác nhận';
    }

    const cuoc_van_chuyen_vnd = Math.floor(Math.random() * 10000000) + 1000000;
    const cuoc_thue_van_chuyen_vnd = i % 3 === 0 ? 0 : Math.floor(Math.random() * 900000) + 100000; // Some with 0 for own vehicle
    const vnd_dau = Math.floor(Math.random() * 1000000) + 5000000;
    const vnd_di_duong = Math.floor(Math.random() * 2000000) + 1000000;

    samples.push({
      id: i,
      ma_chuyen: `MC${String(i).padStart(3, '0')}`,
      ngay_di: ngayDi.toISOString().split('T')[0],
      ngay_ha_hang: trang_thai === TRANG_THAI_LICH_VAN_CHUYEN.HOAN_THANH ? ngay_ha_hang : '',
      trang_thai,
      ma_khach_hang: `KH${String((i % 5) + 1).padStart(3, '0')}`,
      diem_di: 'Kho Nepocorp, Hà Nội',
      diem_den: i % 2 === 0 ? 'Cảng Hải Phòng; Cảng Quảng Ninh' : 'Cảng Đà Nẵng',
      cuoc_van_chuyen_vnd: cuoc_van_chuyen_vnd,
      cuoc_thue_van_chuyen_vnd: cuoc_thue_van_chuyen_vnd,
      bien_so_dau_keo: `15C-${String(10000 + i).substring(1)}`,
      ma_so_cont: i % 2 === 0 ? '20DC' : '40HC',
      ma_nv_giao_nhan: `NV${String(3 + (i % 3)).padStart(3, '0')}`,
      ma_nv_lai_xe: `NV${String(4 + (i % 3)).padStart(3, '0')}`,
      ghi_chu,
      km_hang: parseFloat((Math.random() * 100).toFixed(2)),
      km_vo: parseFloat((Math.random() * 50).toFixed(2)),
      l_dau: parseFloat((Math.random() * 5).toFixed(2)),
      vnd_dau: vnd_dau,
      vnd_di_duong: vnd_di_duong,
      vnd_chi_phi: vnd_dau + vnd_di_duong, // Calculate total cost
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }

  return samples;
};

// Initialize data
lichVanChuyenData = generateSampleLichVanChuyen(15);

/**
 * Get all transport schedules
 * @returns {Promise<Array>} Array of all transport schedules
 */
export const getAllLichVanChuyen = async () => {
  return [...lichVanChuyenData];
};

/**
 * Get a transport schedule by ID
 * @param {number} id - The ID of the transport schedule
 * @returns {Promise<Object|null>} The transport schedule or null if not found
 */
export const getLichVanChuyenById = async id => {
  return lichVanChuyenData.find(item => item.id === id) || null;
};

/**
 * Get a transport schedule by ma_chuyen
 * @param {string} maChuyen - The ma_chuyen of the transport schedule
 * @returns {Promise<Object|null>} The transport schedule or null if not found
 */
export const getLichVanChuyenByMaChuyen = async maChuyen => {
  return lichVanChuyenData.find(item => item.ma_chuyen === maChuyen) || null;
};

/**
 * Create a new transport schedule
 * @param {Object} data - The transport schedule data
 * @returns {Promise<Object>} The created transport schedule
 */
export const createLichVanChuyen = async data => {
  if (!data.ma_chuyen) {
    throw new Error('Mã chuyến là bắt buộc');
  }

  if (lichVanChuyenData.some(item => item.ma_chuyen === data.ma_chuyen)) {
    throw new Error('Mã chuyến đã tồn tại');
  }

  if (data.trang_thai && !Object.values(TRANG_THAI_LICH_VAN_CHUYEN).includes(data.trang_thai)) {
    throw new Error(
      `Trạng thái không hợp lệ. Phải là một trong: ${Object.values(TRANG_THAI_LICH_VAN_CHUYEN).join(', ')}`
    );
  }

  const newId =
    lichVanChuyenData.length > 0 ? Math.max(...lichVanChuyenData.map(item => item.id)) + 1 : 1;

  const now = new Date().toISOString();
  const newRecord = {
    id: newId,
    ma_chuyen: data.ma_chuyen,
    ngay_di: data.ngay_di || new Date().toISOString().split('T')[0],
    ngay_ha_hang: data.ngay_ha_hang || '',
    trang_thai: data.trang_thai || TRANG_THAI_LICH_VAN_CHUYEN.TAM_THOI,
    ma_khach_hang: data.ma_khach_hang || '',
    diem_di: data.diem_di || '',
    diem_den: data.diem_den || '',
    bien_so_dau_keo: data.bien_so_dau_keo || '',
    ma_so_cont: data.ma_so_cont || '',
    ma_nv_giao_nhan: data.ma_nv_giao_nhan || '',
    ma_nv_lai_xe: data.ma_nv_lai_xe || '',
    ghi_chu: data.ghi_chu || '',
    km_hang: data.km_hang || 0,
    km_vo: data.km_vo || 0,
    l_dau: data.l_dau || 0,
    vnd_dau: data.vnd_dau || 0,
    vnd_di_duong: data.vnd_di_duong || 0,
    createdAt: now,
    updatedAt: now,
  };

  lichVanChuyenData.push(newRecord);
  return newRecord;
};

/**
 * Update an existing transport schedule
 * @param {number} id - The ID of the transport schedule to update
 * @param {Object} updates - The fields to update
 * @returns {Promise<Object|null>} The updated transport schedule or null if not found
 */
export const updateLichVanChuyen = async (id, updates) => {
  const index = lichVanChuyenData.findIndex(item => item.id === id);
  if (index === -1) return null;

  const { ma_chuyen: newMaChuyen } = updates;
  if (
    newMaChuyen &&
    lichVanChuyenData.some(item => item.ma_chuyen === newMaChuyen && item.id !== id)
  ) {
    throw new Error('Mã chuyến đã tồn tại');
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

/**
 * Delete a transport schedule
 * @param {number} id - The ID of the transport schedule to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export const deleteLichVanChuyen = async id => {
  const index = lichVanChuyenData.findIndex(item => item.id === id);
  if (index === -1) return false;

  lichVanChuyenData.splice(index, 1);
  return true;
};

/**
 * Reset the transport schedule data (for testing)
 * @param {Array} [data=[]] - Optional data to reset with
 * @returns {Array} The current transport schedule data
 */
export const _resetLichVanChuyen = (data = []) => {
  lichVanChuyenData = [...data];
  return lichVanChuyenData;
};

// Check for duplicate ma_chuyen in seed data
const initialMaChuyen = lichVanChuyenData.map(c => c.ma_chuyen);
const duplicateMaChuyen = initialMaChuyen.filter(
  (item, index) => initialMaChuyen.indexOf(item) !== index
);

if (duplicateMaChuyen.length > 0) {
  console.warn('Duplicate ma_chuyen values found in lichVanChuyen data:', duplicateMaChuyen);
}
