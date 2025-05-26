import { ROLES } from '@shared/config/roles';

export const getConfigForRole = (role) => {
  switch (role) {
    case ROLES.QUAN_LY:
      return quanLyConfig;
    case ROLES.KE_TOAN:
      return keToanConfig;
    default:
      console.warn(`No specific LichVanChuyen config for role: ${role}`);
      return {
        componentName: 'LichVanChuyenDefault',
        permissions: { canAdd: false, canEdit: false, canDelete: false, canView: true },
        tableColumns: [
          { key: 'ngayThang', label: 'Ngày Tháng' },
          { key: 'dienGiai', label: 'Diễn Giải' },
          { key: 'trangThai', label: 'Trạng Thái' },
        ],
        formFields: [],
        defaultValues: { trangThai: 'Xem' },
        actions: [], 
        statusOptions: [],
      };
  }
};

const baseFormFields = [
  { name: 'ngayThang', label: 'Ngày vận chuyển (*)', type: 'date', required: true, gridWidths: { xs: 12, md: 6 } },
  { name: 'khachHangId', label: 'Khách hàng (*)', type: 'select', required: true, optionsKey: 'customers', gridWidths: { xs: 12, md: 6 }, quickAddType: 'customer' },
  { name: 'doiTacId', label: 'Đối tác (*)', type: 'select', required: true, optionsKey: 'partners', gridWidths: { xs: 12, md: 6 }, quickAddType: 'partner' },
  { name: 'phuongTienId', label: 'Phương tiện (*)', type: 'select', required: true, optionsKey: 'vehicles', gridWidths: { xs: 12, md: 6 } },
  { name: 'tuyenDuongId', label: 'Tuyến đường', type: 'select', optionsKey: 'routes', gridWidths: { xs: 12, md: 12 } },
  { name: 'dienGiai', label: 'Diễn giải (*)', type: 'textarea', required: true, rows: 2, gridWidths: { xs: 12 } },
  {
    name: 'thongTinContainer', label: 'Thông tin Container', type: 'containerInfo', gridWidths: { xs: 12 },
    fields: [ 
        { name: 'soContainer', label: 'Số Container', type: 'text', gridWidths: { xs: 12, sm: 6 } }, 
        { name: 'soSeal', label: 'Số Seal', type: 'text', gridWidths: { xs: 12, sm: 6 } },
    ]
  },
  // Adding ngayHaHang to baseFormFields as it's used by both roles in different contexts
  { name: 'ngayHaHang', label: 'Ngày hạ hàng', type: 'date', gridWidths: { xs: 12, md: 6 } },
];

const quanLyConfig = {
  componentName: 'LichVanChuyenQuanLy',
  permissions: { canAdd: true, canEdit: true, canDelete: true, canView: true },
  tableColumns: [
    { key: 'ngayThang', label: 'Ngày Tháng', render: value => value ? new Date(value).toLocaleDateString('vi-VN') : '-' },
    { key: 'bienSoXe', label: 'Biển Số Xe', render: value => value || '-' },
    { key: 'tenKhachHang', label: 'Khách Hàng', render: value => value || '-' }, 
    { key: 'tenDoiTac', label: 'Đối Tác', render: value => value || '-' },
    { key: 'dienGiai', label: 'Diễn Giải', render: value => value || '-' },
    { key: 'tuyenDuong', label: 'Tuyến Đường', render: value => value ? `${value.diemDi} - ${Array.isArray(value.diemDen) ? value.diemDen.join(', ') : value.diemDen}` : '-' },
    { key: 'thongTinContainer', label: 'Số Container/Seal', render: (value) => (Array.isArray(value) && value.length > 0 ? value.map(c => `${c.soContainer || ''}/${c.soSeal || ''}`).join(', ') : '-')},
    { key: 'trangThai', label: 'Trạng Thái', render: value => value || '-' },
    { key: 'actions', label: 'Thao tác', align: 'right' } 
  ],
  formFields: [
    ...baseFormFields.filter(f => f.name !== 'ngayHaHang'), // QL does not manage ngayHaHang via main form
    { name: 'trangThai', label: 'Trạng thái (*)', type: 'select', required: true, optionsKey: 'statusOptions', gridWidths: { xs: 12, md: 6 }, onlyOnEdit: true }
  ],
  defaultValues: {
    trangThai: 'Lên lịch',
    ngayThang: new Date().toISOString().split('T')[0],
    thongTinContainer: [{ soContainer: '', soSeal: '' }],
    khachHangId: '', doiTacId: '', phuongTienId: '', tuyenDuongId: '', dienGiai: '',
  },
  actions: ['edit', 'delete'], 
  statusOptions: [ // Updated for Quản lý
    { value: 'Lên lịch', label: 'Lên lịch' },
    { value: 'Đang chạy', label: 'Đang chạy' },
    { value: 'Hoàn thành', label: 'Hoàn thành' },
    { value: 'Hủy', label: 'Hủy' },
  ],
};

const keToanConfig = {
  componentName: 'LichVanChuyenKeToan',
  permissions: { canAdd: true, canEdit: true, canDelete: false, canView: true },
  tableColumns: [ 
    { key: 'ngayThang', label: 'Ngày Tháng', render: value => value ? new Date(value).toLocaleDateString('vi-VN') : '-' },
    { key: 'bienSoXe', label: 'Biển Số Xe', render: value => value || '-' },
    { key: 'tenKhachHang', label: 'Khách Hàng', render: value => value || '-' },
    { key: 'tenDoiTac', label: 'Đối Tác', render: value => value || '-' },
    { key: 'dienGiai', label: 'Diễn Giải', render: value => value || '-' },
    { key: 'trangThai', label: 'Trạng Thái', render: value => value || '-' },
    { key: 'kmVanChuyenCoHang', label: 'Km Có Hàng', type: 'number', editable: true },
    { key: 'kmVanChuyenRong', label: 'Km Rỗng', type: 'number', editable: true },
    { key: 'chiPhiDauSoLuong', label: 'Dầu (Lít)', type: 'number', editable: true },
    { key: 'chiPhiDauDonGia', label: 'Dầu (Đơn Giá)', type: 'number', editable: true },
    { key: 'chiPhiDauThanhTien', label: 'Dầu (Thành Tiền)', type: 'currency', render: (value, item) => (item.chiPhiDauSoLuong || 0) * (item.chiPhiDauDonGia || 0) },
    { key: 'dinhMucDiDuong', label: 'ĐM Đi Đường', type: 'number', editable: true },
    { 
      key: 'tongChiPhiPhatSinh', 
      label: 'Tổng CP Khác', 
      type: 'currency',
      render: (value, item) => { 
        const sum = item.detailedOtherCosts?.reduce((acc, cost) => acc + cost.amount, 0) || item.tongChiPhiPhatSinh || 0;
        return Number(sum).toLocaleString('vi-VN') + ' VND';
      }
    },
    { key: 'actions', label: 'Thao tác', align: 'right' } 
  ],
  formFields: [
    ...baseFormFields, // Includes ngayHaHang now
    { name: 'kmVanChuyenCoHang', label: 'Km Có Hàng', type: 'number', gridWidths: { xs: 12, md: 6 } },
    { name: 'kmVanChuyenRong', label: 'Km Rỗng', type: 'number', gridWidths: { xs: 12, md: 6 } },
    { name: 'chiPhiDauSoLuong', label: 'Dầu (Lít)', type: 'number', gridWidths: { xs: 12, md: 4 } },
    { name: 'chiPhiDauDonGia', label: 'Dầu (Đơn Giá)', type: 'number', gridWidths: { xs: 12, md: 4 } },
    { name: 'dinhMucDiDuong', label: 'Định Mức Đi Đường', type: 'number', gridWidths: { xs: 12, md: 4 } },
    { name: 'trangThai', label: 'Trạng thái (*)', type: 'select', required: true, optionsKey: 'statusOptions', gridWidths: { xs: 12, md: 6 } } // Not onlyOnEdit
  ],
  defaultValues: {
    trangThai: 'Nháp',
    ngayThang: new Date().toISOString().split('T')[0],
    thongTinContainer: [{ soContainer: '', soSeal: '' }],
    khachHangId: '', doiTacId: '', phuongTienId: '', tuyenDuongId: '', dienGiai: '',
    kmVanChuyenCoHang: 0, kmVanChuyenRong: 0, chiPhiDauSoLuong: 0, chiPhiDauDonGia: 0, dinhMucDiDuong: 0,
    ngayHaHang: '', // Default ngayHaHang for Kế toán
  },
  actions: ['edit', 'manageDetailedCosts'], 
  statusOptions: [ // Updated for Kế toán
    { value: 'Nháp', label: 'Nháp' },
    { value: 'Lên lịch', label: 'Lên lịch' },
    { value: 'Đang chạy', label: 'Đang chạy' }, // Changed from Đang vận chuyển
    { value: 'Hoàn thành', label: 'Hoàn thành' },
  ],
};
