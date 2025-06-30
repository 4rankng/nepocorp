// Test script to verify category mappings
import { getExpenseCategoryLabel } from '@constants/expenseCategories';
import { getInvoiceCategoryLabel } from '@constants/invoiceCategories';

// Test expense categories
const expenseCategories = [
  'FUEL',
  'ROAD_FEES',
  'REPAIRS',
  'TIRES',
  'DRIVER_SALARY',
  'PARKING',
  'MAINTENANCE',
  'INSURANCE',
  'REGISTRATION',
  'OTHER',
];

// Test invoice categories
const invoiceCategories = ['TRANSPORTATION', 'LOGISTICS_SERVICE', 'PORT_FEES', 'OTHER'];

export const testCategoryMappings = () => {
  console.log('=== Expense Category Mappings ===');
  expenseCategories.forEach(category => {
    console.log(`${category} -> ${getExpenseCategoryLabel(category)}`);
  });

  console.log('\n=== Invoice Category Mappings ===');
  invoiceCategories.forEach(category => {
    console.log(`${category} -> ${getInvoiceCategoryLabel(category)}`);
  });
};

// Expected output:
/*
=== Expense Category Mappings ===
FUEL -> Nhiên liệu
ROAD_FEES -> Phí đường bộ
REPAIRS -> Sửa chữa
TIRES -> Lốp xe
DRIVER_SALARY -> Lương tài xế
PARKING -> Phí đỗ xe
MAINTENANCE -> Bảo dưỡng
INSURANCE -> Bảo hiểm
REGISTRATION -> Đăng kiểm
OTHER -> Khác

=== Invoice Category Mappings ===
TRANSPORTATION -> Vận chuyển
LOGISTICS_SERVICE -> Dịch vụ logistics
PORT_FEES -> Phí cảng
OTHER -> Khác
*/
