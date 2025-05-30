import { formatCurrency, addMonths } from '../utils/lopXeUtils';
export const lopXeTableColumns = [
  {
    key: 'licensePlate',
    label: 'Biển số xe',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'replacementDate',
    label: 'Ngày thay lốp',
    render: value => new Date(value).toLocaleDateString('vi-VN'),
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'ngayHetHan',
    label: 'Ngày hết hạn',
    render: (value, record) => {
      let date = value;
      if (!date && record.replacementDate && record.warrantyPeriod) {
        date = addMonths(record.replacementDate, record.warrantyPeriod);
      }
      return date ? new Date(date).toLocaleDateString('vi-VN') : '-';
    },
    sortable: false,
    minWidth: 120,
  },
  {
    key: 'warrantyPeriod',
    label: 'Thời hạn bảo hành',
    render: value => `${value} tháng`,
    align: 'center',
    sortable: true,
    minWidth: 140,
  },
  {
    key: 'quantity',
    label: 'Số lượng',
    align: 'right',
    sortable: true,
    minWidth: 100,
  },
  {
    key: 'unitPrice',
    label: 'Đơn giá',
    render: formatCurrency,
    align: 'right',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'total',
    label: 'Thành tiền',
    render: formatCurrency,
    align: 'right',
    sortable: true,
    minWidth: 120,
  },
  {
    key: 'note',
    label: 'Ghi chú',
    sortable: false,
    minWidth: 200,
    maxWidth: 300,
  },
];
