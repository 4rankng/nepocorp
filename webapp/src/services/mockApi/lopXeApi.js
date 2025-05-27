import lopXeData from '@services/mockData/lopXe';

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
  getAll: async () => ({ data: data.map(toUI) }),
  create: async record => {
    const id = data.length ? Math.max(...data.map(r => r.id)) + 1 : 1;
    const raw = fromUI({ ...record, id });
    data.push(raw);
    persist();
    return { data: toUI(raw) };
  },
  update: async (id, record) => {
    const idx = data.findIndex(r => r.id === id);
    if (idx !== -1) {
      data[idx] = { ...data[idx], ...fromUI(record) };
      persist();
      return { data: toUI(data[idx]) };
    }
    throw new Error('Record not found');
  },
  delete: async id => {
    data = data.filter(r => r.id !== id);
    persist();
    return { success: true };
  },
  reset: () => {
    data = lopXeData.slice();
    persist();
  },
  getCount: async () => data.length,
};
