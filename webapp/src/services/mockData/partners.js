// Partner management mock data and functions

let partnersData = [
  {
    id: 'p1',
    name: 'Công ty Cổ phần Vận tải Việt Nam',
    address: '456 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    taxCode: '0300584873',
  },
  {
    id: 'p2',
    name: 'Công ty Cổ phần Vận tải và Logistics',
    address: '789 Đường Lê Duẩn, Quận 1, TP. Hồ Chí Minh',
    taxCode: '0300584874',
  },
  {
    id: 'p3',
    name: 'Công ty Cổ phần Vận tải Container',
    address: '321 Đường Võ Văn Kiệt, Quận 5, TP. Hồ Chí Minh',
    taxCode: '0300584875',
  },
  {
    id: 'p4',
    name: 'Công ty Cổ phần Vận tải Sài Gòn',
    address: '654 Đường Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
    taxCode: '0300584876',
  },
];

// Partner functions
export const getPartners = () => new Promise(res => setTimeout(() => res([...partnersData]), 50));

export const getPartnersForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(partnersData.map(p => ({ id: p.id, name: p.name }))), 50)
  );

const validatePartnerData = (partnerData, id = null) => {
  if (!partnerData.name || partnerData.name.trim() === '')
    return 'Tên đối tác không được để trống.';

  // Check for duplicate tax code only if provided
  if (partnerData.taxCode && partnerData.taxCode.trim() !== '') {
    if (partnersData.some(p => p.taxCode === partnerData.taxCode.trim() && p.id !== id))
      return 'Mã số thuế đã tồn tại.';
  }

  return null;
};

export const addPartner = partnerData =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validatePartnerData(partnerData);
      if (err) reject(new Error(err));
      else {
        const newPartner = {
          id: String(Date.now()),
          name: partnerData.name.trim(),
          address: partnerData.address ? partnerData.address.trim() : '',
          taxCode: partnerData.taxCode ? partnerData.taxCode.trim() : '',
        };
        partnersData.push(newPartner);
        resolve(newPartner);
      }
    }, 50)
  );

export const updatePartner = (id, updatedPartnerData) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validatePartnerData(updatedPartnerData, id);
      if (err) reject(new Error(err));
      else {
        let updatedPartner = null;
        partnersData = partnersData.map(p =>
          p.id === id
            ? (updatedPartner = {
                ...p,
                name: updatedPartnerData.name.trim(),
                address: updatedPartnerData.address ? updatedPartnerData.address.trim() : '',
                taxCode: updatedPartnerData.taxCode ? updatedPartnerData.taxCode.trim() : '',
              })
            : p
        );
        if (updatedPartner) resolve(updatedPartner);
        else reject(new Error('Không tìm thấy đối tác'));
      }
    }, 50)
  );

export const deletePartner = id =>
  new Promise(res =>
    setTimeout(() => {
      partnersData = partnersData.filter(p => p.id !== id);
      res({ id });
    }, 50)
  );

// Quick partner add with minimal info (for form stepper)
export const addQuickPartner = name =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      if (!name || name.trim() === '') {
        reject(new Error('Tên đối tác không được để trống.'));
        return;
      }

      const trimmedName = name.trim();

      // Check if partner name already exists
      if (partnersData.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        reject(new Error('Đối tác đã tồn tại.'));
        return;
      }

      const newPartner = {
        id: String(Date.now()),
        name: trimmedName,
        address: '',
        taxCode: '',
      };

      partnersData.push(newPartner);
      resolve(newPartner);
    }, 500)
  );
