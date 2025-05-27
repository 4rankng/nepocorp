// Mock database for KhachHang (Customers)
// Static data, 15 records. Numeric auto-incrementing ID.
// Fields: id (numeric), ma_dinh_danh, ten, dia_chi, ma_so_thue, createdAt, updatedAt

let khachHangData = [
  {
    id: 1,
    ma_dinh_danh: 'MDD001',
    ten: 'Công ty TNHH An Phát',
    dia_chi: 'Số 10, Đường Nguyễn Trãi, Phường Thanh Xuân Trung, Quận Thanh Xuân, Hà Nội',
    ma_so_thue: '0100123456',
    createdAt: '2023-01-15T08:30:00Z',
    updatedAt: '2023-05-20T10:00:00Z',
  },
  {
    id: 2,
    ma_dinh_danh: 'MDD002',
    ten: 'Tập đoàn Bình Minh',
    dia_chi: 'Lô A4, Khu Công Nghiệp Sóng Thần, Thị xã Dĩ An, Tỉnh Bình Dương',
    ma_so_thue: '0300987654',
    createdAt: '2023-02-10T14:00:00Z',
    updatedAt: '2023-06-01T09:15:00Z',
  },
  {
    id: 3,
    ma_dinh_danh: 'MDD003',
    ten: 'Doanh nghiệp Tư nhân Cường Thịnh',
    dia_chi: '25B Trần Hưng Đạo, Phường 7, Quận 5, TP. Hồ Chí Minh',
    ma_so_thue: '0200555888',
    createdAt: '2023-03-01T10:20:00Z',
    updatedAt: '2023-04-25T16:45:00Z',
  },
  {
    id: 4,
    ma_dinh_danh: 'MDD004',
    ten: 'Công ty Cổ phần Đại Dương Xanh',
    dia_chi: 'Khu Phố 3, Phường An Hải Bắc, Quận Sơn Trà, TP. Đà Nẵng',
    ma_so_thue: '0400111222',
    createdAt: '2023-04-12T11:00:00Z',
    updatedAt: '2023-07-01T11:30:00Z',
  },
  {
    id: 5,
    ma_dinh_danh: 'MDD005',
    ten: 'Tổng Công ty Đông Á',
    dia_chi:
      'Tòa nhà Central Park, 208 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh',
    ma_so_thue: '0301765432',
    createdAt: '2023-05-05T09:00:00Z',
    updatedAt: '2023-08-10T14:20:00Z',
  },
  {
    id: 6,
    ma_dinh_danh: 'MDD006',
    ten: 'Công ty TNHH Gia Bảo Logistics',
    dia_chi: 'Số 55, Ngõ 120, Đường Hoàng Quốc Việt, Phường Nghĩa Tân, Quận Cầu Giấy, Hà Nội',
    ma_so_thue: '0102345678',
    createdAt: '2023-06-18T16:50:00Z',
    updatedAt: '2023-09-15T08:00:00Z',
  },
  {
    id: 7,
    ma_dinh_danh: 'MDD007',
    ten: 'Công ty Cổ phần Vận tải Hoàng Long',
    dia_chi: 'Bến xe Miền Đông, 292 Đinh Bộ Lĩnh, Phường 26, Quận Bình Thạnh, TP. Hồ Chí Minh',
    ma_so_thue: '0303987123',
    createdAt: '2023-07-22T13:10:00Z',
    updatedAt: '2023-10-02T10:05:00Z',
  },
  {
    id: 8,
    ma_dinh_danh: 'MDD008',
    ten: 'Công ty Kim Ngân Xuất Nhập Khẩu',
    dia_chi: 'Cảng Hải Phòng, Số 2 Lê Thánh Tông, Phường Máy Chai, Quận Ngô Quyền, TP. Hải Phòng',
    ma_so_thue: '0201456789',
    createdAt: '2023-08-03T15:00:00Z',
    updatedAt: '2023-11-11T11:11:00Z',
  },
  {
    id: 9,
    ma_dinh_danh: 'MDD009',
    ten: 'Công ty TNHH Minh Châu Vina',
    dia_chi:
      'Đường số 8, Khu Công Nghiệp Hòa Khánh, Phường Hòa Khánh Bắc, Quận Liên Chiểu, TP. Đà Nẵng',
    ma_so_thue: '0402876543',
    createdAt: '2023-09-10T08:00:00Z',
    updatedAt: '2023-12-01T14:30:00Z',
  },
  {
    id: 10,
    ma_dinh_danh: 'MDD010',
    ten: 'Tập đoàn Nam Việt Group',
    dia_chi: 'Số 1, Đường D1, Khu Công Nghệ Cao, Quận 9, TP. Hồ Chí Minh',
    ma_so_thue: '0304123987',
    createdAt: '2023-10-25T17:20:00Z',
    updatedAt: '2024-01-10T09:45:00Z',
  },
  {
    id: 11,
    ma_dinh_danh: 'MDD011',
    ten: 'Công ty Cổ phần Phát Triển Sài Gòn',
    dia_chi: '194 Hoàng Văn Thụ, Phường 9, Quận Phú Nhuận, TP. Hồ Chí Minh',
    ma_so_thue: '0305678123',
    createdAt: '2023-11-11T11:30:00Z',
    updatedAt: '2024-02-15T16:00:00Z',
  },
  {
    id: 12,
    ma_dinh_danh: 'MDD012',
    ten: 'Công ty TNHH Quang Minh Electric',
    dia_chi: 'Số 30, Đường Giải Phóng, Phường Phương Mai, Quận Đống Đa, Hà Nội',
    ma_so_thue: '0103876543',
    createdAt: '2023-12-01T09:10:00Z',
    updatedAt: '2024-03-20T10:20:00Z',
  },
  {
    id: 13,
    ma_dinh_danh: 'MDD013',
    ten: 'Công ty Cổ phần Thắng Lợi Steel',
    dia_chi: 'Khu Công Nghiệp Phú Bài, Thị xã Hương Thủy, Tỉnh Thừa Thiên Huế',
    ma_so_thue: '0403123456',
    createdAt: '2024-01-08T14:45:00Z',
    updatedAt: '2024-04-10T11:00:00Z',
  },
  {
    id: 14,
    ma_dinh_danh: 'MDD014',
    ten: 'Công ty TNHH Toàn Cầu Logistics',
    dia_chi: 'Cảng Cát Lái, Đường Nguyễn Thị Định, Phường Cát Lái, Quận 2, TP. Hồ Chí Minh',
    ma_so_thue: '0306543210',
    createdAt: '2024-02-14T10:00:00Z',
    updatedAt: '2024-05-05T15:30:00Z',
  },
  {
    id: 15,
    ma_dinh_danh: 'MDD015',
    ten: 'Doanh nghiệp Việt Hưng Phát',
    dia_chi: 'Số 789, Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
    ma_so_thue: '0307890123',
    createdAt: '2024-03-20T16:00:00Z',
    updatedAt: '2024-05-15T09:00:00Z',
  },
];

let nextKhachHangId = 16; // Start next ID after the initial 15 records

export const getAllKhachHang = async () => {
  return [...khachHangData];
};

export const getKhachHangById = async id => {
  // Ensure ID is treated as a number for comparison if it comes as a string
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return khachHangData.find(kh => kh.id === numericId) || null;
};

export const createKhachHang = async data => {
  const newKhachHang = {
    ...data, // Expects ma_dinh_danh, ten, dia_chi, ma_so_thue
    id: nextKhachHangId++,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  // Ensure required fields are present from data
  if (!data.ma_dinh_danh || !data.ten || !data.dia_chi || !data.ma_so_thue) {
    // In a real API, you'd throw an error or return a specific error response
    console.error('Missing required fields for new KhachHang:', data);
    return null; // Or throw new Error("Missing required fields");
  }
  khachHangData.push(newKhachHang);
  return newKhachHang;
};

export const updateKhachHang = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = khachHangData.findIndex(kh => kh.id === numericId);
  if (index === -1) return null;

  // Ensure ID is not changed by updates
  const { id: _, ...validUpdates } = updates;

  khachHangData[index] = {
    ...khachHangData[index],
    ...validUpdates, // Apply only valid updates
    updatedAt: new Date().toISOString(),
  };
  return khachHangData[index];
};

export const deleteKhachHang = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = khachHangData.findIndex(kh => kh.id === numericId);
  if (index === -1) return false;
  khachHangData.splice(index, 1);
  return true;
};

// For testing
export const _resetKhachHang = (data = []) => {
  khachHangData = data.map((item, index) => ({ ...item, id: index + 1 })); // Ensure numeric IDs if resetting
  nextKhachHangId = khachHangData.length > 0 ? Math.max(...khachHangData.map(kh => kh.id)) + 1 : 1;
  console.log('KhachHang data reset. Next ID:', nextKhachHangId);
};

// Initialize nextId based on current data, in case of manual changes to initial data
if (khachHangData.length > 0) {
  nextKhachHangId = Math.max(...khachHangData.map(kh => kh.id)) + 1;
} else {
  nextKhachHangId = 1;
}
console.log('Initial nextKhachHangId:', nextKhachHangId);
