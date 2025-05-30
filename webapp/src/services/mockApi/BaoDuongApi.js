import baoDuongData, { isValidBienSo } from '@services/mockData/baoDuong';
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
    return mockApiCall(() => withPagination(() => data, { page, limit }));
  },
  create: async record => {
    return mockApiCall(
      withCreate(() => {
        // Validate bien_so exists in the system
        if (!isValidBienSo(record.bien_so)) {
          throw new Error(
            `Biển số "${record.bien_so}" không tồn tại trong hệ thống. Vui lòng kiểm tra lại.`
          );
        }
        const id = data.length ? Math.max(...data.map(r => r.id)) + 1 : 1;
        const now = new Date().toISOString();
        const raw = { 
          ...record, 
          id,
          created_at: now,
          updated_at: now 
        };
        data.push(raw);
        persist();
        return raw;
      })
    );
  },
  update: async (id, record) => {
    return mockApiCall(
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
          updated_at: new Date().toISOString() 
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
    return mockApiCall(() => withSingleItem(() => data.length, ErrorCodes.NOT_FOUND, 'Không thể lấy số lượng lốp xe'));
  },
};
