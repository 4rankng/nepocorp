// Mock data for vehicles - combines dauKeo and roMooc data
// This is a compatibility file for components that still use the old import pattern
import { getAllDauKeo } from './dauKeo';
import { getAllRoMooc } from './roMooc';
// Get all vehicles (combination of dauKeo and roMooc)
export const getVehicles = async () => {
  const [dauKeoData, roMoocData] = await Promise.all([getAllDauKeo(), getAllRoMooc()]);
  // Combine and format vehicle data
  const vehicles = [
    ...dauKeoData.map(item => ({
      id: item.id,
      licensePlate: item.bien_so,
      name: `${item.bien_so} (${item.mo_ta})`,
      description: item.mo_ta,
      type: 'dau_keo',
      bien_so: item.bien_so,
      mo_ta: item.mo_ta,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    ...roMoocData.map(item => ({
      id: item.id,
      licensePlate: item.bien_so,
      name: `${item.bien_so} (${item.mo_ta})`,
      description: item.mo_ta,
      type: 'ro_mooc',
      bien_so: item.bien_so,
      mo_ta: item.mo_ta,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  ];
  return vehicles;
};
// Get vehicles formatted for select options
export const getVehiclesForSelect = async () => {
  const vehicles = await getVehicles();
  return vehicles.map(vehicle => ({
    id: vehicle.id,
    value: vehicle.id,
    label: vehicle.name,
    licensePlate: vehicle.licensePlate,
    type: vehicle.type,
  }));
};
// Export individual vehicle types for backward compatibility
export const getTractors = async () => {
  const vehicles = await getVehicles();
  return vehicles.filter(v => v.type === 'dau_keo');
};
export const getTrailers = async () => {
  const vehicles = await getVehicles();
  return vehicles.filter(v => v.type === 'ro_mooc');
};
export default {
  getVehicles,
  getVehiclesForSelect,
  getTractors,
  getTrailers,
};
