// Mock database for NhanVien (Employees)
// Static data. Numeric auto-incrementing ID.
// Fields: id, ma_so, ho_ten, ten_dang_nhap, mat_khau, chuc_vu, email, createdAt, updatedAt

const originalNhanVienData = [
  {
    id: 1,
    ma_so: 'QL001',
    ho_ten: 'Trần Văn Quản',
    ten_dang_nhap: 'quan.tv',
    mat_khau: 'password123',
    chuc_vu: 'quan-ly',
    email: 'quan.tv@example.com',
    createdAt: '2023-01-05T08:00:00Z',
    updatedAt: '2024-05-01T10:00:00Z',
  },
  {
    id: 2,
    ma_so: 'KT001',
    ho_ten: 'Lê Thị Kế',
    ten_dang_nhap: 'ke.lt',
    mat_khau: 'password123',
    chuc_vu: 'ke-toan',
    email: 'ke.lt@example.com',
    createdAt: '2023-01-10T09:00:00Z',
    updatedAt: '2024-05-05T11:00:00Z',
  },
  {
    id: 3,
    ma_so: 'GN001',
    ho_ten: 'Phạm Hữu Giao',
    ten_dang_nhap: 'giao.ph',
    mat_khau: 'password123',
    chuc_vu: 'giao-nhan',
    email: 'giao.ph@example.com',
    createdAt: '2023-01-15T10:00:00Z',
    updatedAt: '2024-04-20T12:00:00Z',
  },
  {
    id: 4,
    ma_so: 'LX001',
    ho_ten: 'Nguyễn Văn Lái',
    ten_dang_nhap: 'lai.nv',
    mat_khau: 'password123',
    chuc_vu: 'lai-xe',
    email: 'lai.nv@example.com',
    createdAt: '2023-01-20T11:00:00Z',
    updatedAt: '2024-05-10T13:00:00Z',
  },
  {
    id: 5,
    ma_so: 'LX002',
    ho_ten: 'Hoàng Thị Xe',
    ten_dang_nhap: 'xe.ht',
    mat_khau: 'password123',
    chuc_vu: 'lai-xe',
    email: null,
    createdAt: '2023-02-01T12:00:00Z',
    updatedAt: '2024-04-25T14:00:00Z',
  },
  {
    id: 6,
    ma_so: 'KT002',
    ho_ten: 'Đặng Văn Toán',
    ten_dang_nhap: 'toan.dv',
    mat_khau: 'password123',
    chuc_vu: 'ke-toan',
    email: 'toan.dv@example.com',
    createdAt: '2023-02-10T13:00:00Z',
    updatedAt: '2024-05-15T15:00:00Z',
  },
  {
    id: 7,
    ma_so: 'GN002',
    ho_ten: 'Vũ Minh Nhận',
    ten_dang_nhap: 'nhan.vm',
    mat_khau: 'password123',
    chuc_vu: 'giao-nhan',
    email: 'nhan.vm@example.com',
    createdAt: '2023-02-20T14:00:00Z',
    updatedAt: '2024-05-02T16:00:00Z',
  },
  {
    id: 8,
    ma_so: 'LX003',
    ho_ten: 'Bùi Văn Tài',
    ten_dang_nhap: 'tai.bv',
    mat_khau: 'password123',
    chuc_vu: 'lai-xe',
    email: 'tai.bv@example.com',
    createdAt: '2023-03-01T15:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  },
  {
    id: 9,
    ma_so: 'QL002',
    ho_ten: 'Ngô Thị Lý',
    ten_dang_nhap: 'ly.nt',
    mat_khau: 'password123',
    chuc_vu: 'quan-ly',
    email: 'ly.nt@example.com',
    createdAt: '2023-03-10T16:00:00Z',
    updatedAt: '2024-05-20T16:00:00Z',
  },
  {
    id: 10,
    ma_so: 'LX004',
    ho_ten: 'Đỗ Thành Công',
    ten_dang_nhap: 'cong.dt',
    mat_khau: 'password123',
    chuc_vu: 'lai-xe',
    email: null,
    createdAt: '2023-03-20T17:00:00Z',
    updatedAt: '2024-05-20T17:00:00Z',
  },
  {
    id: 11,
    ma_so: 'KT003',
    ho_ten: 'Mai Anh Thư',
    ten_dang_nhap: 'thu.ma',
    mat_khau: 'password123',
    chuc_vu: 'ke-toan',
    email: 'thu.ma@example.com',
    createdAt: '2023-04-01T08:30:00Z',
    updatedAt: '2024-05-03T09:30:00Z',
  },
  {
    id: 12,
    ma_so: 'GN003',
    ho_ten: 'Lý Văn Thông',
    ten_dang_nhap: 'thong.lv',
    mat_khau: 'password123',
    chuc_vu: 'giao-nhan',
    email: 'thong.lv@example.com',
    createdAt: '2023-04-10T09:30:00Z',
    updatedAt: '2024-04-28T10:30:00Z',
  },
  {
    id: 13,
    ma_so: 'LX005',
    ho_ten: 'Trịnh Hoài An',
    ten_dang_nhap: 'an.th',
    mat_khau: 'password123',
    chuc_vu: 'lai-xe',
    email: 'an.th@example.com',
    createdAt: '2023-04-20T10:30:00Z',
    updatedAt: '2024-05-13T11:30:00Z',
  },
  {
    id: 14,
    ma_so: 'LX006',
    ho_ten: 'Châu Tuấn Kiệt',
    ten_dang_nhap: 'kiet.ct',
    mat_khau: 'password123',
    chuc_vu: 'lai-xe',
    email: null,
    createdAt: '2023-05-01T11:30:00Z',
    updatedAt: '2024-04-23T12:30:00Z',
  },
  {
    id: 15,
    ma_so: 'GN004',
    ho_ten: 'Dương Hoài Nam',
    ten_dang_nhap: 'nam.dh',
    mat_khau: 'password123',
    chuc_vu: 'giao-nhan',
    email: 'nam.dh@example.com',
    createdAt: '2023-05-10T12:30:00Z',
    updatedAt: '2024-05-18T13:30:00Z',
  },
];

let nhanVienData = [...originalNhanVienData];
let nextNhanVienId = originalNhanVienData.length > 0 ? Math.max(...originalNhanVienData.map(nv => nv.id)) + 1 : 1;
const CHUC_VU_TYPES = ['quan-ly', 'ke-toan', 'giao-nhan', 'lai-xe'];
export const getAllNhanVien = async () => {
  return [...nhanVienData];
};
export const getNhanVienById = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  return nhanVienData.find(nv => nv.id === numericId) || null;
};
export const createNhanVien = async data => {
  const { ma_so, ho_ten, ten_dang_nhap, mat_khau, chuc_vu, email } = data;
  if (!ma_so || !ho_ten || !ten_dang_nhap || !mat_khau || !chuc_vu) {
    console.error('Missing required fields for new NhanVien:', data);
    return null;
  }
  if (!CHUC_VU_TYPES.includes(chuc_vu)) {
    console.error('Invalid chuc_vu for new NhanVien:', chuc_vu);
    return null;
  }
  const newNhanVien = {
    id: nextNhanVienId++,
    ma_so,
    ho_ten,
    ten_dang_nhap,
    mat_khau, // In a real app, this should be hashed
    chuc_vu,
    email: email !== undefined ? email : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  nhanVienData.push(newNhanVien);
  return newNhanVien;
};
export const updateNhanVien = async (id, updates) => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = nhanVienData.findIndex(nv => nv.id === numericId);
  if (index === -1) return null;
  const { id: _, createdAt: __, ...validUpdates } = updates;
  if (validUpdates.chuc_vu && !CHUC_VU_TYPES.includes(validUpdates.chuc_vu)) {
    console.error('Invalid chuc_vu for NhanVien update:', validUpdates.chuc_vu);
    return null; // Or handle error appropriately
  }
  nhanVienData[index] = {
    ...nhanVienData[index],
    ...validUpdates,
    email: validUpdates.email !== undefined ? validUpdates.email : nhanVienData[index].email, // Preserve email if not provided
    updatedAt: new Date().toISOString(),
  };
  return nhanVienData[index];
};
export const deleteNhanVien = async id => {
  const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
  const index = nhanVienData.findIndex(nv => nv.id === numericId);
  if (index === -1) return false;
  nhanVienData.splice(index, 1);
  return true;
};
export const _resetNhanVien = (data) => {
      if (data) {
        nhanVienData = [...data]; // Use provided data as is
      } else {
        nhanVienData = [...originalNhanVienData]; // Reset to a fresh copy of original data, preserving original IDs
      }

      if (nhanVienData.length > 0) {
        // Recalculate nextNhanVienId based on the current state of nhanVienData
        nextNhanVienId = Math.max(...nhanVienData.map(nv => nv.id)) + 1;
      } else {
        nextNhanVienId = 1;
      }
    };
// This block is now handled within _resetNhanVien
