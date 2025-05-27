/* global btoa */

import {
  // Authentication
  verifyCredentials,
  // Container Types
  getContainerTypes,
  addContainerType,
  updateContainerType,
  deleteContainerType,
  // Vehicles
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  // Maintenance
  getMaintenanceRecords,
  addMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  // Customers
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  // Shipment Plans
  getShipmentPlans,
  addShipmentPlan,
  updateShipmentPlan,
  deleteShipmentPlan,
  updateShipmentPlanField,
  addDetailedOtherCostItem,
  updateDetailedOtherCostItem,
  deleteDetailedOtherCostItem,
  // Fuel Standards
  getFuelStandards,
  addFuelStandard,
  updateFuelStandard,
  deleteFuelStandard,
  // Reports
  getMonthlyProfitAndRevenueReport,
  getVehicleMonthlyDetailsReport,
} from './mockData/index.js';

// Helper function to simulate API response with delay
const apiResponse = (data, status = 200, delay = 200) =>
  new Promise(resolve => setTimeout(() => resolve({ data, status }), delay));

// Helper function to simulate API error
const apiError = (message, status = 400) =>
  Promise.reject({
    response: {
      status,
      data: { error: message, code: `ERR_${status}` },
    },
  });

// Authentication API
export const login = async (username, password) => {
  try {
    const user = verifyCredentials(username, password);
    if (!user) {
      return apiError('Invalid username or password', 401);
    }
    // Generate a mock JWT token
    const token = btoa(JSON.stringify({ username, role: user.role, exp: Date.now() + 86400000 }));
    return apiResponse({ token, user });
  } catch (error) {
    return apiError(error.message, 500);
  }
};

// Container Types API
export const containerTypeApi = {
  getAll: async () => {
    try {
      const containerTypes = await getContainerTypes();
      return apiResponse(containerTypes);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  getById: async id => {
    try {
      const containerTypes = await getContainerTypes();
      const containerType = containerTypes.find(ct => ct.id === id);
      if (!containerType) {
        return apiError('Container type not found', 404);
      }
      return apiResponse(containerType);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  create: async data => {
    try {
      const newContainerType = await addContainerType(data.name);
      return apiResponse(newContainerType, 201);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  update: async (id, data) => {
    try {
      const updatedContainerType = await updateContainerType(id, data.name);
      return apiResponse(updatedContainerType);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  delete: async id => {
    try {
      await deleteContainerType(id);
      return apiResponse({ id }, 204);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
};

// Vehicles API
export const vehicleApi = {
  getAll: async () => {
    try {
      const vehicles = await getVehicles();
      return apiResponse(vehicles);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  getById: async id => {
    try {
      const vehicles = await getVehicles();
      const vehicle = vehicles.find(v => v.id === id);
      if (!vehicle) {
        return apiError('Không tìm thấy thông tin xe', 404);
      }
      return apiResponse(vehicle);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  create: async data => {
    try {
      const newVehicle = await addVehicle({
        licensePlate: data.licensePlate,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        containerCount: data.containerCount,
        note: data.note,
        // Include additional fields if provided
        ...(data.status && { status: data.status }),
        ...(data.registrationDate && { registrationDate: data.registrationDate }),
        ...(data.lastMaintenance && { lastMaintenance: data.lastMaintenance }),
        ...(data.nextMaintenance && { nextMaintenance: data.nextMaintenance }),
        ...(data.insuranceExpiry && { insuranceExpiry: data.insuranceExpiry }),
        ...(data.driver && { driver: data.driver }),
        ...(data.phone && { phone: data.phone }),
      });
      return apiResponse(newVehicle, 201);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  update: async (id, data) => {
    try {
      const updatedVehicle = await updateVehicle(id, {
        licensePlate: data.licensePlate,
        vehicleType: data.vehicleType,
        capacity: data.capacity,
        containerCount: data.containerCount,
        note: data.note,
        // Include additional fields if provided
        ...(data.status && { status: data.status }),
        ...(data.registrationDate && { registrationDate: data.registrationDate }),
        ...(data.lastMaintenance && { lastMaintenance: data.lastMaintenance }),
        ...(data.nextMaintenance && { nextMaintenance: data.nextMaintenance }),
        ...(data.insuranceExpiry && { insuranceExpiry: data.insuranceExpiry }),
        ...(data.driver && { driver: data.driver }),
        ...(data.phone && { phone: data.phone }),
      });
      return apiResponse(updatedVehicle);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  delete: async id => {
    try {
      await deleteVehicle(id);
      return apiResponse({ id }, 204);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
};

// Customers API
export const customerApi = {
  getAll: async () => {
    try {
      const customers = await getCustomers();
      return apiResponse(customers);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  getById: async id => {
    try {
      const customers = await getCustomers();
      const customer = customers.find(c => c.id === id);
      if (!customer) {
        return apiError('Không tìm thấy khách hàng', 404);
      }
      return apiResponse(customer);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  create: async data => {
    try {
      // If code is not provided, it will be auto-generated in the mock data
      const newCustomer = await addCustomer({
        ...data,
        code: data.code || undefined, // Let the mock data handle auto-generation if code is empty
      });
      return apiResponse(newCustomer, 201);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  getByCode: async code => {
    try {
      const customers = await getCustomers();
      const customer = customers.find(c => c.code && c.code.toLowerCase() === code.toLowerCase());
      if (!customer) {
        return apiError('Không tìm thấy khách hàng với mã này', 404);
      }
      return apiResponse(customer);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  update: async (id, data) => {
    try {
      const updatedCustomer = await updateCustomer(id, data);
      return apiResponse(updatedCustomer);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  delete: async id => {
    try {
      await deleteCustomer(id);
      return apiResponse({ id }, 204);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
};

// Shipment Plans API
export const shipmentPlanApi = {
  getAll: async (filters = {}) => {
    try {
      let plans = await getShipmentPlans();

      // Apply filters if provided
      if (filters.startDate && filters.endDate) {
        plans = plans.filter(
          plan => plan.ngayThang >= filters.startDate && plan.ngayThang <= filters.endDate
        );
      }

      if (filters.vehicleId) {
        plans = plans.filter(plan => plan.bienSoXeId === filters.vehicleId);
      }

      if (filters.status) {
        plans = plans.filter(plan => plan.trangThai === filters.status);
      }

      return apiResponse(plans);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  getById: async id => {
    try {
      const plans = await getShipmentPlans();
      const plan = plans.find(p => p.id === id);
      if (!plan) {
        return apiError('Shipment plan not found', 404);
      }
      return apiResponse(plan);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  create: async data => {
    try {
      const newPlan = await addShipmentPlan(data);
      return apiResponse(newPlan, 201);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  update: async (id, data) => {
    try {
      // Handle field updates if specified
      if (data.field && data.value !== undefined) {
        const updatedPlan = await updateShipmentPlanField(id, data.field, data.value);
        return apiResponse(updatedPlan);
      }
      // Full update
      const updatedPlan = await updateShipmentPlan(id, data);
      return apiResponse(updatedPlan);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  delete: async id => {
    try {
      await deleteShipmentPlan(id);
      return apiResponse({ id }, 204);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  // Additional methods for detailed costs
  addCostItem: async (planId, itemData) => {
    try {
      const updatedPlan = await addDetailedOtherCostItem(planId, itemData.name, itemData.amount);
      return apiResponse(updatedPlan);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  updateCostItem: async (planId, itemId, itemData) => {
    try {
      const updatedPlan = await updateDetailedOtherCostItem(
        planId,
        itemId,
        itemData.name,
        itemData.amount
      );
      return apiResponse(updatedPlan);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  deleteCostItem: async (planId, itemId) => {
    try {
      const updatedPlan = await deleteDetailedOtherCostItem(planId, itemId);
      return apiResponse(updatedPlan);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
};

// Maintenance Records API
export const maintenanceApi = {
  getAll: async () => {
    try {
      const records = await getMaintenanceRecords();
      return apiResponse(records);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  getById: async id => {
    try {
      const records = await getMaintenanceRecords();
      const record = records.find(r => r.id === id);
      if (!record) {
        return apiError('Maintenance record not found', 404);
      }
      return apiResponse(record);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  create: async data => {
    try {
      const newRecord = await addMaintenanceRecord(data);
      return apiResponse(newRecord, 201);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  update: async (id, data) => {
    try {
      const updatedRecord = await updateMaintenanceRecord(id, data);
      return apiResponse(updatedRecord);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  delete: async id => {
    try {
      await deleteMaintenanceRecord(id);
      return apiResponse({ id }, 204);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
};

// Fuel Standards API
export const fuelStandardApi = {
  getAll: async () => {
    try {
      const standards = await getFuelStandards();
      return apiResponse(standards);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  getById: async id => {
    try {
      const standards = await getFuelStandards();
      const standard = standards.find(fs => fs.id === id);
      if (!standard) {
        return apiError('Fuel standard not found', 404);
      }
      return apiResponse(standard);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
  create: async data => {
    try {
      const newStandard = await addFuelStandard(data);
      return apiResponse(newStandard, 201);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  update: async (id, data) => {
    try {
      const updatedStandard = await updateFuelStandard(id, data);
      return apiResponse(updatedStandard);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
  delete: async id => {
    try {
      await deleteFuelStandard(id);
      return apiResponse({ id }, 204);
    } catch (error) {
      return apiError(error.message, 400);
    }
  },
};

// Reports API
export const reportApi = {
  // Financial Reports
  getProfitAndRevenue: async (filters = {}) => {
    try {
      const report = await getMonthlyProfitAndRevenueReport(filters.startDate, filters.endDate);
      return apiResponse(report);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },

  // Vehicle Monthly Details Report
  getVehicleMonthlyDetails: async (vehicleId, monthYear) => {
    try {
      const report = await getVehicleMonthlyDetailsReport(vehicleId, monthYear);
      return apiResponse(report);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },

  // Get available months for reports
  getAvailableReportMonths: async () => {
    try {
      // This would come from your data service
      const availableMonths = [
        '2024-01',
        '2024-02',
        '2024-03',
        '2024-04',
        '2024-05',
        '2024-06',
        '2024-07',
        '2024-08',
        '2024-09',
        '2024-10',
        '2024-11',
        '2024-12',
      ];
      return apiResponse(availableMonths);
    } catch (error) {
      return apiError(error.message, 500);
    }
  },
};

export default {
  login,
  containerTypeApi,
  vehicleApi,
  customerApi,
  shipmentPlanApi,
  maintenanceApi,
  fuelStandardApi,
  reportApi,
};
