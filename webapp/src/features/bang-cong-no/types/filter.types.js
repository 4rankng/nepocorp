// Filter type definitions and constants

export const FILTER_TYPES = {
  CUSTOMER: 'customer',
  PARTNER: 'partner',
  TRANSACTION_TYPE: 'transaction_type',
  DATE_RANGE: 'date_range',
  AMOUNT_RANGE: 'amount_range',
  SEARCH: 'search',
};

export const DATE_RANGE_PRESETS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_WEEK: 'this_week',
  LAST_WEEK: 'last_week',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
  THIS_QUARTER: 'this_quarter',
  LAST_QUARTER: 'last_quarter',
  THIS_YEAR: 'this_year',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom',
};

export const DATE_RANGE_LABELS = {
  [DATE_RANGE_PRESETS.TODAY]: 'Hôm nay',
  [DATE_RANGE_PRESETS.YESTERDAY]: 'Hôm qua',
  [DATE_RANGE_PRESETS.THIS_WEEK]: 'Tuần này',
  [DATE_RANGE_PRESETS.LAST_WEEK]: 'Tuần trước',
  [DATE_RANGE_PRESETS.THIS_MONTH]: 'Tháng này',
  [DATE_RANGE_PRESETS.LAST_MONTH]: 'Tháng trước',
  [DATE_RANGE_PRESETS.THIS_QUARTER]: 'Quý này',
  [DATE_RANGE_PRESETS.LAST_QUARTER]: 'Quý trước',
  [DATE_RANGE_PRESETS.THIS_YEAR]: 'Năm này',
  [DATE_RANGE_PRESETS.LAST_YEAR]: 'Năm trước',
  [DATE_RANGE_PRESETS.CUSTOM]: 'Tùy chọn',
};

export const DATE_RANGE_OPTIONS = Object.keys(DATE_RANGE_LABELS).map(key => ({
  value: key,
  label: DATE_RANGE_LABELS[key],
}));

// Helper function to get date range
export const getDateRange = preset => {
  const today = new Date();

  switch (preset) {
    case DATE_RANGE_PRESETS.TODAY: {
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      return {
        startDate: startOfDay.toISOString().split('T')[0],
        endDate: endOfDay.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.YESTERDAY: {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return {
        startDate: yesterday.toISOString().split('T')[0],
        endDate: yesterday.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.THIS_WEEK: {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.LAST_WEEK: {
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 6); // Last Monday
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // Last Sunday
      return {
        startDate: lastWeekStart.toISOString().split('T')[0],
        endDate: lastWeekEnd.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.THIS_MONTH: {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.LAST_MONTH: {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        startDate: lastMonthStart.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.THIS_QUARTER: {
      const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
      const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0);
      return {
        startDate: quarterStart.toISOString().split('T')[0],
        endDate: quarterEnd.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.LAST_QUARTER: {
      const lastQuarterMonth = Math.floor(today.getMonth() / 3) * 3 - 3;
      const lastQuarterStart = new Date(today.getFullYear(), lastQuarterMonth, 1);
      const lastQuarterEnd = new Date(today.getFullYear(), lastQuarterMonth + 3, 0);
      return {
        startDate: lastQuarterStart.toISOString().split('T')[0],
        endDate: lastQuarterEnd.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.THIS_YEAR: {
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31);
      return {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: endOfYear.toISOString().split('T')[0],
      };
    }

    case DATE_RANGE_PRESETS.LAST_YEAR: {
      const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
      return {
        startDate: lastYearStart.toISOString().split('T')[0],
        endDate: lastYearEnd.toISOString().split('T')[0],
      };
    }

    default:
      return null;
  }
};

// Default filter state
export const createEmptyFilters = () => ({
  customer_id: null,
  partner_id: null,
  transaction_type: null,
  start_date: null,
  end_date: null,
  search: '',
  amount_min: null,
  amount_max: null,
});

// Filter validation
export const validateFilters = filters => {
  const errors = {};

  if (filters.start_date && filters.end_date) {
    const startDate = new Date(filters.start_date);
    const endDate = new Date(filters.end_date);

    if (startDate > endDate) {
      errors.date_range = 'Ngày bắt đầu phải trước ngày kết thúc';
    }
  }

  if (filters.amount_min && filters.amount_max) {
    const minAmount = parseFloat(filters.amount_min);
    const maxAmount = parseFloat(filters.amount_max);

    if (minAmount > maxAmount) {
      errors.amount_range = 'Số tiền tối thiểu phải nhỏ hơn số tiền tối đa';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Check if filters are active
export const hasActiveFilters = filters => {
  const emptyFilters = createEmptyFilters();

  return Object.keys(filters).some(key => {
    const value = filters[key];
    const emptyValue = emptyFilters[key];

    if (typeof value === 'string') {
      return value.trim() !== emptyValue;
    }

    return value !== emptyValue;
  });
};

// Count active filters
export const countActiveFilters = filters => {
  const emptyFilters = createEmptyFilters();

  return Object.keys(filters).reduce((count, key) => {
    const value = filters[key];
    const emptyValue = emptyFilters[key];

    if (key === 'start_date' || key === 'end_date') {
      // Count date range as one filter
      if (filters.start_date && filters.end_date && count === 0) {
        return count + 1;
      }
      return count;
    }

    if (typeof value === 'string') {
      return value.trim() !== emptyValue ? count + 1 : count;
    }

    return value !== emptyValue ? count + 1 : count;
  }, 0);
};
