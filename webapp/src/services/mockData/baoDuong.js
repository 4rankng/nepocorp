// Import existing vehicle data for validation
import { getAllDauKeo } from './dauKeo';
import { getAllRoMooc } from './roMooc';
// Get all existing vehicle license plates
const getAllValidBienSo = async () => {
  try {
    // Get data from the API services
    const [dauKeoResponse, roMoocResponse] = await Promise.all([getAllDauKeo(), getAllRoMooc()]);
    // Extract data from API responses
    const extractData = response => {
      if (Array.isArray(response)) return response;
      if (response?.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }
      return [];
    };
    const dauKeoList = extractData(dauKeoResponse);
    const roMoocList = extractData(roMoocResponse);
    // Extract license plates
    const dauKeoBienSo = dauKeoList.map(dk => dk?.bien_so).filter(Boolean);
    const roMoocBienSo = roMoocList.map(rm => rm?.bien_so).filter(Boolean);
    // Combine and deduplicate
    const allBienSo = [...new Set([...dauKeoBienSo, ...roMoocBienSo])];
    return allBienSo;
  } catch (error) {

    return [];
  }
};
// Mock database for BaoDuong (Maintenance Records)
// Fields: id, bien_so, item_name, ngay_thay, ngay_het_han, so_thang_bao_hanh, so_luong, don_gia, currency, tong_tien, ghi_chu, created_at, updated_at
const baoDuongData = [
  {
    id: 1,
    bien_so: '51C-001.01',
    item_name: 'Lốp xe',
    ngay_thay: '2024-05-01',
    ngay_het_han: '2025-05-01',
    so_thang_bao_hanh: 12,
    so_luong: 2,
    don_gia: 3500000,
    currency: 'VND',
    tong_tien: 7000000,
    ghi_chu: 'Thay lốp trước',
    created_at: '2024-05-01',
    updated_at: '2024-05-01',
  },
  {
    id: 2,
    bien_so: '29H-111.22',
    item_name: 'Dầu máy',
    ngay_thay: '2024-04-15',
    ngay_het_han: '2024-10-15',
    so_thang_bao_hanh: 6,
    so_luong: 1,
    don_gia: 1200000,
    currency: 'VND',
    tong_tien: 1200000,
    ghi_chu: 'Thay dầu máy',
    created_at: '2024-04-15',
    updated_at: '2024-04-15',
  },
  {
    id: 3,
    bien_so: '60A-222.33',
    item_name: 'Ắc quy',
    ngay_thay: '2024-03-20',
    ngay_het_han: '2025-03-20',
    so_thang_bao_hanh: 12,
    so_luong: 1,
    don_gia: 2500000,
    currency: 'VND',
    tong_tien: 2500000,
    ghi_chu: 'Thay ắc quy',
    created_at: '2024-03-20',
    updated_at: '2024-03-20',
  },
  {
    id: 4,
    bien_so: '51C-333.44',
    item_name: 'Lọc gió',
    ngay_thay: '2024-02-10',
    ngay_het_han: '2024-08-10',
    so_thang_bao_hanh: 6,
    so_luong: 1,
    don_gia: 400000,
    currency: 'VND',
    tong_tien: 400000,
    ghi_chu: 'Thay lọc gió',
    created_at: '2024-02-10',
    updated_at: '2024-02-10',
  },
  {
    id: 5,
    bien_so: '29H-444.55',
    item_name: 'Phanh',
    ngay_thay: '2024-01-25',
    ngay_het_han: '2024-07-25',
    so_thang_bao_hanh: 6,
    so_luong: 2,
    don_gia: 800000,
    currency: 'VND',
    tong_tien: 1600000,
    ghi_chu: 'Thay phanh trước',
    created_at: '2024-01-25',
    updated_at: '2024-01-25',
  },
  {
    id: 6,
    bien_so: '60A-555.66',
    item_name: 'Lốp xe',
    ngay_thay: '2024-05-10',
    ngay_het_han: '2025-05-10',
    so_thang_bao_hanh: 12,
    so_luong: 4,
    don_gia: 3200000,
    currency: 'VND',
    tong_tien: 12800000,
    ghi_chu: 'Thay toàn bộ lốp',
    created_at: '2024-05-10',
    updated_at: '2024-05-10',
  },
  {
    id: 7,
    bien_so: '51C-666.77',
    item_name: 'Dầu hộp số',
    ngay_thay: '2024-04-05',
    ngay_het_han: '2024-10-05',
    so_thang_bao_hanh: 6,
    so_luong: 1,
    don_gia: 1800000,
    currency: 'VND',
    tong_tien: 1800000,
    ghi_chu: 'Thay dầu hộp số',
    created_at: '2024-04-05',
    updated_at: '2024-04-05',
  },
  {
    id: 8,
    bien_so: '29H-777.88',
    item_name: 'Lọc dầu',
    ngay_thay: '2024-03-15',
    ngay_het_han: '2024-09-15',
    so_thang_bao_hanh: 6,
    so_luong: 1,
    don_gia: 350000,
    currency: 'VND',
    tong_tien: 350000,
    ghi_chu: 'Thay lọc dầu',
    created_at: '2024-03-15',
    updated_at: '2024-03-15',
  },
  {
    id: 9,
    bien_so: '60A-888.99',
    item_name: 'Bugi',
    ngay_thay: '2024-02-28',
    ngay_het_han: '2025-02-28',
    so_thang_bao_hanh: 12,
    so_luong: 4,
    don_gia: 150000,
    currency: 'VND',
    tong_tien: 600000,
    ghi_chu: 'Thay bugi',
    created_at: '2024-02-28',
    updated_at: '2024-02-28',
  },
  {
    id: 10,
    bien_so: '51C-999.00',
    item_name: 'Lốp xe',
    ngay_thay: '2024-01-18',
    ngay_het_han: '2025-01-18',
    so_thang_bao_hanh: 12,
    so_luong: 2,
    don_gia: 3400000,
    currency: 'VND',
    tong_tien: 6800000,
    ghi_chu: 'Thay lốp sau',
    created_at: '2024-01-18',
    updated_at: '2024-01-18',
  },
  {
    id: 11,
    bien_so: '29H-100.01',
    item_name: 'Dầu phanh',
    ngay_thay: '2024-05-20',
    ngay_het_han: '2024-11-20',
    so_thang_bao_hanh: 6,
    so_luong: 1,
    don_gia: 600000,
    currency: 'VND',
    tong_tien: 600000,
    ghi_chu: 'Thay dầu phanh',
    created_at: '2024-05-20',
    updated_at: '2024-05-20',
  },
  {
    id: 12,
    bien_so: '60A-321.23',
    item_name: 'Dây curoa',
    ngay_thay: '2024-03-10',
    ngay_het_han: '2025-03-10',
    so_thang_bao_hanh: 12,
    so_luong: 1,
    don_gia: 900000,
    currency: 'VND',
    tong_tien: 900000,
    ghi_chu: 'Thay dây curoa',
    created_at: '2024-03-10',
    updated_at: '2024-03-10',
  },
  {
    id: 13,
    bien_so: '51C-222.11',
    item_name: 'Lốp xe',
    ngay_thay: '2024-02-05',
    ngay_het_han: '2025-02-05',
    so_thang_bao_hanh: 12,
    so_luong: 6,
    don_gia: 3300000,
    currency: 'VND',
    tong_tien: 19800000,
    ghi_chu: 'Thay lốp toàn bộ',
    created_at: '2024-02-05',
    updated_at: '2024-02-05',
  },
  {
    id: 14,
    bien_so: '29H-555.44',
    item_name: 'Bình nước',
    ngay_thay: '2024-04-01',
    ngay_het_han: '2025-04-01',
    so_thang_bao_hanh: 12,
    so_luong: 1,
    don_gia: 750000,
    currency: 'VND',
    tong_tien: 750000,
    ghi_chu: 'Thay bình nước',
    created_at: '2024-04-01',
    updated_at: '2024-04-01',
  },
  {
    id: 15,
    bien_so: '60A-654.32',
    item_name: 'Lọc gió',
    ngay_thay: '2024-05-22',
    ngay_het_han: '2024-11-22',
    so_thang_bao_hanh: 6,
    so_luong: 2,
    don_gia: 410000,
    currency: 'VND',
    tong_tien: 820000,
    ghi_chu: 'Thay lọc gió',
    created_at: '2024-05-22',
    updated_at: '2024-05-22',
  },
];
// Function to validate if a bien_so exists in the system
const isValidBienSo = async bienSo => {
  try {
    if (!bienSo) {

      return false;
    }
    const validBienSoList = await getAllValidBienSo();
    if (!Array.isArray(validBienSoList)) {

      return false;
    }
    const isValid = validBienSoList.includes(bienSo);
    return isValid;
  } catch (error) {

    return false;
  }
};
// Function to get all valid bien_so values
const getValidBienSoList = async () => {
  try {
    const bienSoList = await getAllValidBienSo();
    return Array.isArray(bienSoList) ? bienSoList : [];
  } catch (error) {

    return [];
  }
};
// Export the main data and utility functions
export { isValidBienSo, getValidBienSoList };
export default baoDuongData;
