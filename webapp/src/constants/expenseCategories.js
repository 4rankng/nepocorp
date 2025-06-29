// Expense category constants matching backend values
export const EXPENSE_CATEGORIES = {
  FUEL: 'FUEL',
  ROAD_FEES: 'ROAD_FEES',
  REPAIRS: 'REPAIRS',
  TIRES: 'TIRES',
  DRIVER_SALARY: 'DRIVER_SALARY',
  PARKING: 'PARKING',
  MAINTENANCE: 'MAINTENANCE',
  INSURANCE: 'INSURANCE',
  REGISTRATION: 'REGISTRATION',
  OTHER: 'OTHER'
};

// Vietnamese labels for expense categories
export const EXPENSE_CATEGORY_LABELS = {
  [EXPENSE_CATEGORIES.FUEL]: 'Nhiên liệu',
  [EXPENSE_CATEGORIES.ROAD_FEES]: 'Phí đường bộ',
  [EXPENSE_CATEGORIES.REPAIRS]: 'Sửa chữa',
  [EXPENSE_CATEGORIES.TIRES]: 'Lốp xe',
  [EXPENSE_CATEGORIES.DRIVER_SALARY]: 'Lương tài xế',
  [EXPENSE_CATEGORIES.PARKING]: 'Phí đỗ xe',
  [EXPENSE_CATEGORIES.MAINTENANCE]: 'Bảo dưỡng',
  [EXPENSE_CATEGORIES.INSURANCE]: 'Bảo hiểm',
  [EXPENSE_CATEGORIES.REGISTRATION]: 'Đăng kiểm',
  [EXPENSE_CATEGORIES.OTHER]: 'Khác'
};

// Helper function to get Vietnamese label for expense category
export const getExpenseCategoryLabel = (categoryName) => {
  return EXPENSE_CATEGORY_LABELS[categoryName] || categoryName;
};

export default {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  getExpenseCategoryLabel
};