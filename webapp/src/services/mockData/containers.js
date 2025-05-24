// Container types management mock data and functions

let containerTypesData = [
  { id: 'ct1', name: "20'DC" },
  { id: 'ct2', name: "40'DC" },
  { id: 'ct3', name: "40'HC" },
  { id: 'ct4', name: "20'RF" },
  { id: 'ct5', name: "45'HC" },
];

// Mock containers for backward compatibility
export const mockContainers = [
  { id: 'C001', type: '20ft', status: 'available' },
  { id: 'C002', type: '40ft', status: 'in-use' },
];

// Container type functions
export const getContainerTypes = () =>
  new Promise(res => setTimeout(() => res([...containerTypesData]), 50));

export const getContainerTypesForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(containerTypesData.map(ct => ({ id: ct.id, name: ct.name }))), 50)
  );

const validateContainerTypeData = (name, id = null) => {
  if (!name || name.trim() === '') return 'Tên loại container không được để trống.';
  if (containerTypesData.some(c => c.name === name.trim() && c.id !== id))
    return 'Tên loại container đã tồn tại.';
  return null;
};

export const addContainerType = typeName =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateContainerTypeData(typeName);
      if (err) reject(new Error(err));
      else {
        const newType = { id: String(Date.now()), name: typeName.trim() };
        containerTypesData.push(newType);
        resolve(newType);
      }
    }, 50)
  );

export const updateContainerType = (id, updatedName) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateContainerTypeData(updatedName, id);
      if (err) reject(new Error(err));
      else {
        let updatedType = null;
        containerTypesData = containerTypesData.map(t =>
          t.id === id ? (updatedType = { ...t, name: updatedName.trim() }) : t
        );
        if (updatedType) resolve(updatedType);
        else reject(new Error('Không tìm thấy loại container'));
      }
    }, 50)
  );

export const deleteContainerType = id =>
  new Promise(res =>
    setTimeout(() => {
      containerTypesData = containerTypesData.filter(t => t.id !== id);
      res({ id });
    }, 50)
  );
