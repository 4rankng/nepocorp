// Vehicle management mock data and functions

let vehiclesData = [
  {
    id: 'v1',
    licensePlate: '51C-12345',
    vehicleType: 'truck',
    capacity: '5 tấn',
    containerCount: 1,
    note: 'Xe tải thùng kín',
    status: 'active',
    registrationDate: '2023-01-15',
    lastMaintenance: '2023-11-20',
    nextMaintenance: '2024-02-20',
    insuranceExpiry: '2024-12-31',
    driver: 'Nguyễn Văn A',
    phone: '0912345678',
  },
  {
    id: 'v2',
    licensePlate: '29H-54321',
    vehicleType: 'container',
    capacity: '20 tấn',
    containerCount: 2,
    note: 'Xe container 40 feet',
    status: 'active',
    registrationDate: '2022-11-10',
    lastMaintenance: '2023-12-15',
    nextMaintenance: '2024-03-15',
    insuranceExpiry: '2024-10-30',
    driver: 'Trần Văn B',
    phone: '0987654321',
  },
  {
    id: 'v3',
    licensePlate: '60A-98765',
    vehicleType: 'tractor',
    capacity: '40 tấn',
    containerCount: 1,
    note: 'Đầu kéo container',
    status: 'maintenance',
    registrationDate: '2023-03-22',
    lastMaintenance: '2023-10-05',
    nextMaintenance: '2024-01-05',
    insuranceExpiry: '2024-09-15',
    driver: 'Lê Thị C',
    phone: '0905123456',
  },
  {
    id: 'v4',
    licensePlate: '51F-11223',
    vehicleType: 'trailer',
    capacity: '35 tấn',
    containerCount: 1,
    note: 'Rơ moóc 3 trục',
    status: 'active',
    registrationDate: '2023-02-18',
    lastMaintenance: '2023-11-30',
    nextMaintenance: '2024-02-28',
    insuranceExpiry: '2024-11-30',
    driver: 'Phạm Văn D',
    phone: '0918765432',
  },
];

// Mock vehicles for backward compatibility
export const mockVehicles = [
  { id: 'V001', bienSo: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
  { id: 'V002', bienSo: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
  { id: 'V003', bienSo: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
];

// Vehicle functions
export const getVehicles = () => new Promise(res => setTimeout(() => res([...vehiclesData]), 50));

export const getVehiclesForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(vehiclesData.map(v => ({ id: v.id, name: v.licensePlate }))), 50)
  );

const validateVehicleData = (data, id = null) => {
  if (!data.licensePlate || data.licensePlate.trim() === '')
    return 'Biển số xe không được để trống.';
  if (vehiclesData.some(v => v.licensePlate === data.licensePlate.trim() && v.id !== id))
    return 'Biển số xe đã tồn tại.';
  if (!data.vehicleType) return 'Vui lòng chọn loại xe';
  if (!data.capacity) return 'Vui lòng nhập trọng tải';
  return null;
};

export const addVehicle = data =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateVehicleData(data);
      if (err) {
        reject(new Error(err));
        return;
      }

      const newVehicle = {
        id: `v${Date.now()}`,
        licensePlate: data.licensePlate.trim(),
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        containerCount: data.containerCount || 1,
        note: data.note || '',
        status: 'active',
        registrationDate: new Date().toISOString().split('T')[0],
        lastMaintenance: '',
        nextMaintenance: '',
        insuranceExpiry: '',
        driver: '',
        phone: '',
      };

      vehiclesData.push(newVehicle);
      resolve(newVehicle);
    }, 50)
  );

export const updateVehicle = (id, updatedData) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateVehicleData(updatedData, id);
      if (err) {
        reject(new Error(err));
        return;
      }

      let updatedVehicle = null;
      vehiclesData = vehiclesData.map(v => {
        if (v.id === id) {
          updatedVehicle = {
            ...v,
            licensePlate: updatedData.licensePlate.trim(),
            vehicleType: updatedData.vehicleType,
            capacity: updatedData.capacity,
            containerCount: updatedData.containerCount || 1,
            note: updatedData.note || '',
            // Keep existing values for other fields unless explicitly updated
            ...(updatedData.status && { status: updatedData.status }),
            ...(updatedData.registrationDate && { registrationDate: updatedData.registrationDate }),
            ...(updatedData.lastMaintenance && { lastMaintenance: updatedData.lastMaintenance }),
            ...(updatedData.nextMaintenance && { nextMaintenance: updatedData.nextMaintenance }),
            ...(updatedData.insuranceExpiry && { insuranceExpiry: updatedData.insuranceExpiry }),
            ...(updatedData.driver && { driver: updatedData.driver }),
            ...(updatedData.phone && { phone: updatedData.phone }),
          };
          return updatedVehicle;
        }
        return v;
      });

      if (updatedVehicle) {
        resolve(updatedVehicle);
      } else {
        reject(new Error('Không tìm thấy xe'));
      }
    }, 50)
  );

export const deleteVehicle = id =>
  new Promise(res =>
    setTimeout(() => {
      vehiclesData = vehiclesData.filter(v => v.id !== id);
      res({ id });
    }, 50)
  );
