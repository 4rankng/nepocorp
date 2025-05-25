// Container types management mock data and functions

let containerTypesData = [
  { id: 'ct1', type: "20'DC", description: 'Container khô 20 feet tiêu chuẩn' },
  { id: 'ct2', type: "40'DC", description: 'Container khô 40 feet tiêu chuẩn' },
  { id: 'ct3', type: "40'HC", description: 'Container cao 40 feet' },
  { id: 'ct4', type: "40'RF", description: 'Container lạnh 40 feet' },
  { id: 'ct5', type: "40'OT", description: 'Container mở nóc 40 feet' },
  { id: 'ct6', type: "45'HC", description: 'Container cao 45 feet' },
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
    setTimeout(() => res(containerTypesData.map(ct => ({ id: ct.id, name: ct.type }))), 50)
  );

const validateContainerTypeData = (containerTypeData, id = null) => {
  if (!containerTypeData.type || containerTypeData.type.trim() === '')
    return 'Loại container không được để trống.';

  if (containerTypesData.some(c => c.type === containerTypeData.type.trim() && c.id !== id))
    return 'Loại container đã tồn tại.';

  return null;
};

export const addContainerType = containerTypeData =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateContainerTypeData(containerTypeData);
      if (err) reject(new Error(err));
      else {
        const newType = {
          id: String(Date.now()),
          type: containerTypeData.type.trim(),
          description: containerTypeData.description ? containerTypeData.description.trim() : '',
        };
        containerTypesData.push(newType);
        resolve(newType);
      }
    }, 50)
  );

export const updateContainerType = (id, updatedContainerTypeData) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateContainerTypeData(updatedContainerTypeData, id);
      if (err) reject(new Error(err));
      else {
        let updatedType = null;
        containerTypesData = containerTypesData.map(t =>
          t.id === id
            ? (updatedType = {
                ...t,
                type: updatedContainerTypeData.type.trim(),
                description: updatedContainerTypeData.description ? updatedContainerTypeData.description.trim() : '',
              })
            : t
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
