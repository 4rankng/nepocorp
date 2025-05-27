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
  const vehicles = [];

  // Add tractors (đầu kéo)
  dauKeoList.forEach(item => {
    vehicles.push({
      value: item.id,
      label: `${item.bien_so} (${item.mo_ta})`,
      type: 'dau_keo',
    });
  });

  // Add trailers (rơ moóc)
  roMoocList.forEach(item => {
    vehicles.push({
      value: item.id,
      label: `${item.bien_so} (${item.mo_ta})`,
      type: 'ro_mooc',
    });
  });

  return vehicles;
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
  return containersList.map(container => ({
    value: container.id,
    label: container.id,
  }));
};

// Import addKhachHang for addQuickCustomer
import { addKhachHang } from '@services/mockApi/index.js';

// Helper function to add a new customer quickly
export const addQuickCustomer = async customerName => {
  if (!customerName || customerName.trim() === '') {
    throw new Error('Tên khách hàng không được để trống');
  }

  const newCustomerData = {
    ma_dinh_danh: `MDD${Date.now()}`, // Generate unique identifier
    ten: customerName.trim(),
    dia_chi: '', // Default empty address
    ma_so_thue: '', // Default empty tax code
  };

  const newCustomer = await addKhachHang(newCustomerData);
  return newCustomer;
};
