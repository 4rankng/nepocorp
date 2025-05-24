// Fuel standards management mock data and functions

let fuelStandardsData = [
  { id: 1, licensePlate: '51C-12345', fromKm: 0, toKm: 10000, standard: 0.35, note: 'Mới' },
  { id: 2, licensePlate: '51C-12345', fromKm: 10000, toKm: 30000, standard: 0.32, note: 'Chạy rà' },
  { id: 3, licensePlate: '51C-12345', fromKm: 30000, toKm: 100000, standard: 0.3, note: 'Ổn định' },
  { id: 4, licensePlate: '29H-54321', fromKm: 0, toKm: 5000, standard: 0.38, note: 'Mới' },
  { id: 5, licensePlate: '29H-54321', fromKm: 5000, toKm: 20000, standard: 0.35, note: 'Chạy rà' },
  { id: 6, licensePlate: '60A-98765', fromKm: 0, toKm: 15000, standard: 0.4, note: 'Xe tải nặng' },
  { id: 7, licensePlate: '51F-11223', fromKm: 0, toKm: 8000, standard: 0.42, note: 'Rơ moóc mới' },
];

// Fuel standard functions
export const getFuelStandards = () =>
  new Promise(res => setTimeout(() => res([...fuelStandardsData]), 50));

export const getLicensePlatesForFuelStandards = () =>
  new Promise(res => {
    // Mock license plates - in real implementation this would come from vehicles data
    const licensePlates = [
      { id: 'v1', licensePlate: '51C-12345' },
      { id: 'v2', licensePlate: '29H-54321' },
      { id: 'v3', licensePlate: '60A-98765' },
      { id: 'v4', licensePlate: '51F-11223' },
    ];
    setTimeout(() => res(licensePlates), 50);
  });

const validateFuelStandardData = (data, id = null) => {
  if (!data.licensePlate || data.licensePlate.trim() === '')
    return 'Biển số xe không được để trống.';
  if (!data.fromKm && data.fromKm !== 0) return 'Km bắt đầu không được để trống.';
  if (!data.toKm) return 'Km kết thúc không được để trống.';
  if (parseFloat(data.fromKm) >= parseFloat(data.toKm))
    return 'Km kết thúc phải lớn hơn km bắt đầu.';
  if (!data.standard) return 'Định mức không được để trống.';

  // Check for overlapping ranges
  const from = parseFloat(data.fromKm);
  const to = parseFloat(data.toKm);
  const overlapping = fuelStandardsData.some(item => {
    if (item.id === id) return false; // Skip current item when editing
    if (item.licensePlate !== data.licensePlate) return false;
    return (
      (from >= item.fromKm && from < item.toKm) ||
      (to > item.fromKm && to <= item.toKm) ||
      (from <= item.fromKm && to >= item.toKm)
    );
  });

  if (overlapping) {
    return 'Khoảng km này đã được định nghĩa cho biển số xe này.';
  }

  return null;
};

export const addFuelStandard = data =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateFuelStandardData(data);
      if (err) reject(new Error(err));
      else {
        const newStandard = {
          id: Date.now(),
          licensePlate: data.licensePlate.trim(),
          fromKm: Number(data.fromKm),
          toKm: Number(data.toKm),
          standard: Number(data.standard),
          note: data.note ? data.note.trim() : '',
        };
        fuelStandardsData.push(newStandard);
        resolve(newStandard);
      }
    }, 50)
  );

export const updateFuelStandard = (id, data) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateFuelStandardData(data, id);
      if (err) reject(new Error(err));
      else {
        let updatedStandard = null;
        fuelStandardsData = fuelStandardsData.map(item =>
          item.id === id
            ? (updatedStandard = {
                id,
                licensePlate: data.licensePlate.trim(),
                fromKm: Number(data.fromKm),
                toKm: Number(data.toKm),
                standard: Number(data.standard),
                note: data.note ? data.note.trim() : '',
              })
            : item
        );
        if (updatedStandard) resolve(updatedStandard);
        else reject(new Error('Không tìm thấy định mức dầu'));
      }
    }, 50)
  );

export const deleteFuelStandard = id =>
  new Promise(res =>
    setTimeout(() => {
      fuelStandardsData = fuelStandardsData.filter(item => item.id !== id);
      res({ id });
    }, 50)
  );
