import baoDuongData, { isValidBienSo, getValidBienSoList } from '@services/mockData/baoDuong';
import {
  mockApiCall,
  withPagination,
  withSingleItem,
  withCreate,
  withUpdate,
  withDelete,
  ErrorCodes,
} from './apiWrapper.js';
let data;
if (
  typeof window !== 'undefined' &&
  window.localStorage &&
  window.localStorage.getItem('baoDuongData')
) {
  data = JSON.parse(window.localStorage.getItem('baoDuongData'));
} else {
  data = baoDuongData.slice();
}
const persist = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('baoDuongData', JSON.stringify(data));
  }
};
export const baoDuongApi = {
  getAll: async (page = 1, limit = 10) => {
    console.log('🔗 BaoDuongApi - getAll called with:', { page, limit });

    return mockApiCall(() => {
      const result = withPagination(
        () => [...data], // Return a copy of the data array to avoid mutations
        {
          page: Math.max(1, parseInt(page, 10) || 1), // Ensure page is at least 1
          limit: Math.max(1, parseInt(limit, 10) || 10), // Ensure limit is at least 1
        }
      );

      console.log('📋 BaoDuongApi - Returning result:', {
        dataLength: result.data?.length || 0,
        meta: result.meta,
        totalDataInStorage: data.length,
        requestedPage: page,
        requestedLimit: limit,
      });

      return result;
    });
  },
  create: async record => {
    return mockApiCall(() =>
      withCreate(async () => {
        try {
          // Validate required fields
          if (!record.bien_so || !record.item_name || !record.ngay_thay) {
            throw new Error('Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại.');
          }
          // Ensure we have a valid license plate format
          const trimmedBienSo = String(record.bien_so).trim();
          if (!trimmedBienSo) {
            throw new Error('Biển số không được để trống');
          }
          // Get all valid license plates for validation
          const validBienSoList = await getValidBienSoList();
          // Check if the provided license plate exists in the system
          const isValid = validBienSoList.includes(trimmedBienSo);
          console.log('License plate validation result:', {
            provided: trimmedBienSo,
            isValid,
            validPlates: validBienSoList,
          });
          if (!isValid) {
            throw new Error(
              `Biển số "${trimmedBienSo}" không tồn tại trong hệ thống. Vui lòng kiểm tra lại.`
            );
          }
          // Calculate total if not provided
          const so_luong = Number(record.so_luong) || 1;
          const don_gia = Number(record.don_gia) || 0;
          const tong_tien = so_luong * don_gia;
          // Create new record with calculated fields
          const id = data.length ? Math.max(...data.map(r => r.id)) + 1 : 1;
          const now = new Date().toISOString();
          const raw = {
            ...record,
            id,
            bien_so: trimmedBienSo, // Ensure consistent formatting
            so_luong,
            don_gia,
            tong_tien,
            created_at: now,
            updated_at: now,
            // Ensure these fields exist with defaults
            currency: record.currency || 'VND',
            ghi_chu: record.ghi_chu || '',
            so_thang_bao_hanh: Number(record.so_thang_bao_hanh) || 0,
            ngay_het_han: record.ngay_het_han || '',
          };
          data.push(raw);
          persist();
          return raw;
        } catch (error) {
          console.error('Error in BaoDuongApi.create:', error);
          // Format error message for better user feedback
          const errorMessage = error.message || 'Đã xảy ra lỗi khi tạo bản ghi bảo dưỡng';
          const formattedError = new Error(errorMessage);
          formattedError.originalError = error;
          throw formattedError;
        }
      })
    );
  },
  update: async (id, record) => {
    return mockApiCall(() =>
      withUpdate(() => {
        const idx = data.findIndex(r => r.id === id);
        if (idx === -1) throw new Error('Không tìm thấy bản ghi');
        // If bien_so is being updated, validate it exists in the system
        if (record.bien_so && record.bien_so !== data[idx].bien_so) {
          if (!isValidBienSo(record.bien_so)) {
            throw new Error(
              `Biển số "${record.bien_so}" không tồn tại trong hệ thống. Vui lòng kiểm tra lại.`
            );
          }
        }
        const updatedRecord = {
          ...data[idx],
          ...record,
          id,
          updated_at: new Date().toISOString(),
        };
        data[idx] = updatedRecord;
        persist();
        return updatedRecord;
      })
    );
  },
  delete: async id => {
    return mockApiCall(
      withDelete(
        () => {
          const initialLength = data.length;
          data = data.filter(r => r.id !== id);
          persist();
          return initialLength !== data.length;
        },
        ErrorCodes.NOT_FOUND,
        'Thông tin lốp xe không tồn tại'
      ),
      'BaoDuong'
    );
  },
  reset: () => {
    return mockApiCall(() => {
      data = baoDuongData.slice();
      persist();
      return true;
    }, 'BaoDuong');
  },
  getCount: async () => {
    return mockApiCall(() =>
      withSingleItem(() => data.length, ErrorCodes.NOT_FOUND, 'Không thể lấy số lượng lốp xe')
    );
  },
  getByBienSo: async (bienSo, page = 1, limit = 10) => {
    return mockApiCall(() => {
      const filtered = data.filter(r => r.bien_so === bienSo);
      return withPagination(() => filtered, {
        page: Math.max(1, parseInt(page, 10) || 1),
        limit: Math.max(1, parseInt(limit, 10) || 10),
      });
    });
  },
};
