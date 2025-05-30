import lopXeData from '@services/mockData/lopXe';
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
  window.localStorage.getItem('lopXeData')
) {
  data = JSON.parse(window.localStorage.getItem('lopXeData'));
} else {
  data = lopXeData.slice();
}
const persist = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('lopXeData', JSON.stringify(data));
  }
};
const toUI = item => ({
  id: item.id,
  licensePlate: item.bien_so,
  replacementDate: item.ngay_thay,
  warrantyPeriod: item.so_thang_bao_hanh,
  quantity: item.so_luong,
  unitPrice: item.don_gia,
  total: item.tong_tien,
  note: item.ghi_chu,
  currency: item.currency,
});
const fromUI = item => ({
  id: item.id,
  bien_so: item.licensePlate,
  ngay_thay: item.replacementDate,
  so_thang_bao_hanh: item.warrantyPeriod,
  so_luong: item.quantity,
  don_gia: item.unitPrice,
  tong_tien: item.total,
  ghi_chu: item.note,
  currency: item.currency || 'VND',
});
export const lopXeApi = {
  getAll: async (page = 1, limit = 10) => {
    return mockApiCall(() => withPagination(() => data.map(toUI), { page, limit }));
  },

  create: async record => {
    return mockApiCall(
      withCreate(() => {
        const id = data.length ? Math.max(...data.map(r => r.id)) + 1 : 1;
        const raw = fromUI({ ...record, id });
        data.push(raw);
        persist();
        return toUI(raw);
      })
    );
  },

  update: async (id, record) => {
    return mockApiCall(
      withUpdate(
        () => {
          const idx = data.findIndex(r => r.id === id);
          if (idx !== -1) {
            data[idx] = { ...data[idx], ...fromUI(record) };
            persist();
            return toUI(data[idx]);
          }
          return null;
        },
        ErrorCodes.NOT_FOUND,
        'Thông tin lốp xe không tồn tại'
      ),
      'LopXe'
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
      'LopXe'
    );
  },

  reset: () => {
    return mockApiCall(() => {
      data = lopXeData.slice();
      persist();
      return true;
    }, 'LopXe');
  },

  getCount: async () => {
    return mockApiCall(
      withSingleItem(() => data.length, ErrorCodes.NOT_FOUND, 'Không thể lấy số lượng lốp xe'),
      'LopXe'
    );
  },
};
