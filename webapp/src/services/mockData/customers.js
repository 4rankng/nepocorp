// Customer management mock data and functions

let customersData = [
  {
    id: 'c1',
    code: 'CDMC',
    name: 'Công ty Cổ phần Chè Đắk Lắk',
    address: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
    taxCode: '5500157123',
  },
  {
    id: 'c2',
    code: 'VNM',
    name: 'Công ty Cổ phần Sữa Việt Nam',
    address: '10 Tôn Đản, Quận 4, TP. Hồ Chí Minh',
    taxCode: '0300584870',
  },
  {
    id: 'c3',
    code: 'THP',
    name: 'Công ty Cổ phần Tập đoàn THP',
    address: '25 Nguyễn Thị Minh Khai, Quận 1, TP. Hồ Chí Minh',
    taxCode: '0300584871',
  },
  {
    id: 'c4',
    code: 'VNM2',
    name: 'Công ty Cổ phần Đường Quảng Ngãi',
    address: '15 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    taxCode: '0300584872',
  },
];

// Customer functions
export const getCustomers = () => new Promise(res => setTimeout(() => res([...customersData]), 50));

export const getCustomersForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(customersData.map(c => ({ id: c.id, name: c.name }))), 50)
  );

const validateCustomerData = (customerData, id = null) => {
  if (!customerData.code || customerData.code.trim() === '')
    return 'Mã khách hàng không được để trống.';
  if (!customerData.name || customerData.name.trim() === '')
    return 'Tên khách hàng không được để trống.';
  if (!customerData.address || customerData.address.trim() === '')
    return 'Địa chỉ không được để trống.';
  if (!customerData.taxCode || customerData.taxCode.trim() === '')
    return 'Mã số thuế không được để trống.';

  if (customersData.some(c => c.code === customerData.code.trim() && c.id !== id))
    return 'Mã khách hàng đã tồn tại.';
  if (customersData.some(c => c.taxCode === customerData.taxCode.trim() && c.id !== id))
    return 'Mã số thuế đã tồn tại.';
  return null;
};

export const addCustomer = customerData =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateCustomerData(customerData);
      if (err) reject(new Error(err));
      else {
        const newCustomer = {
          id: String(Date.now()),
          code: customerData.code.trim(),
          name: customerData.name.trim(),
          address: customerData.address.trim(),
          taxCode: customerData.taxCode.trim(),
        };
        customersData.push(newCustomer);
        resolve(newCustomer);
      }
    }, 50)
  );

export const updateCustomer = (id, updatedCustomerData) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateCustomerData(updatedCustomerData, id);
      if (err) reject(new Error(err));
      else {
        let updatedCustomer = null;
        customersData = customersData.map(c =>
          c.id === id
            ? (updatedCustomer = {
                ...c,
                code: updatedCustomerData.code.trim(),
                name: updatedCustomerData.name.trim(),
                address: updatedCustomerData.address.trim(),
                taxCode: updatedCustomerData.taxCode.trim(),
              })
            : c
        );
        if (updatedCustomer) resolve(updatedCustomer);
        else reject(new Error('Không tìm thấy khách hàng'));
      }
    }, 50)
  );

export const deleteCustomer = id =>
  new Promise(res =>
    setTimeout(() => {
      customersData = customersData.filter(c => c.id !== id);
      res({ id });
    }, 50)
  );
