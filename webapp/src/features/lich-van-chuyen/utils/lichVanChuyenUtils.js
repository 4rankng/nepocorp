// Helper to format date from YYYY-MM-DD to DD/MM/YYYY for display
export const formatDateForDisplay = dateStr_YYYYMMDD => {
  if (!dateStr_YYYYMMDD) return '-';
  const [year, month, day] = dateStr_YYYYMMDD.split('-');
  return `${day}/${month}/${year}`;
};
// Helper to format date from DD/MM/YYYY to YYYY-MM-DD for date input
export const formatDateForInput = dateStr_DDMMYYYY => {
  if (!dateStr_DDMMYYYY) return '';
  const parts = dateStr_DDMMYYYY.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ''; // Invalid format
};
// Helper to format vehicles data for select options
export const formatVehiclesForSelect = (dauKeoList, roMoocList) => {
  const dauKeoOptions = (dauKeoList || []).map(item => ({
    value: item.id,
    label: `${item.bien_so} (${item.mo_ta || item.loai_xe || '-'})`,
  }));
  const roMoocOptions = (roMoocList || []).map(item => ({
    value: item.id,
    label: `${item.bien_so} (${item.mo_ta || item.loai_ro_mooc || '-'})`,
  }));
  return {
    dauKeo: dauKeoOptions,
    roMooc: roMoocOptions,
  };
};
// Helper to format customers data for select options
export const formatCustomersForSelect = customersList => {
  return customersList.map(customer => ({
    value: customer.id,
    label: customer.ten,
    ma_dinh_danh: customer.ma_dinh_danh,
  }));
};
// Helper to format employees data for select options
export const formatEmployeesForSelect = employeesList => {
  return employeesList.map(employee => ({
    value: employee.id,
    label: `${employee.ho_ten} (${employee.ma_so})`,
    chuc_vu: employee.chuc_vu,
  }));
};
// Helper to format containers data for select options
export const formatContainersForSelect = containersList => {
  return containersList.map(container => {
    const label = container.category
      ? `${String(container.id)} (${String(container.category)})`
      : String(container.id);
    return {
      value: container.id,
      label: label,
    };
  });
};
// Helper function to add a new customer quickly
// Helper to get human-readable status display string
export const formatCurrencyVND = (value, fallback = '-') => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return fallback;
  }
  // Remove decimals for VND as it typically doesn't use them
  return Number(value).toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
export const getDisplayTrangThai = rawTrangThai => {
  switch (rawTrangThai) {
    case 'tam_thoi':
      return 'Tạm thời';
    case 'len_lich':
      return 'Lên lịch';
    case 'dang_chay':
      return 'Đang chạy';
    case 'hoan_thanh':
      return 'Hoàn thành';
    case 'huy_bo':
      return 'Hủy bỏ';
    default:
      return rawTrangThai || 'Không xác định'; // Fallback to raw or 'Unknown'
  }
};
export const addQuickCustomer = async customerName => {
  if (!customerName || customerName.trim() === '') {
    throw new Error('Tên khách hàng không được để trống');
  }
  // const newCustomerData = {
  //   ma_dinh_danh: `MDD${Date.now()}`, // Generate unique identifier
  //   ten: customerName.trim(),
  //   dia_chi: '', // Default empty address
  //   ma_so_thue: '', // Default empty tax code
  // };
  // TODO: Replace with actual API call
  throw new Error('API function not implemented');
};
