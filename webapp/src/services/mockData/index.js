// Main index file for modular mock data
// This file consolidates all mock data modules while maintaining backward compatibility

// Import all modules
import * as auth from './auth.js';
import * as vehicles from './vehicles.js';
import * as containers from './containers.js';
import * as employees from './employees.js';
import * as customers from './customers.js';
import * as partners from './partners.js';
import * as costRates from './costRates.js';
import * as shipmentPlans from './shipmentPlans.js';
import * as reports from './reports.js';
import * as fuelStandards from './fuelStandards.js';

// Re-export everything from auth module
export const { users, roles, getUserByUsername, verifyCredentials } = auth;

// Re-export everything from vehicles module
export const {
  mockVehicles,
  getVehicles,
  getVehiclesForSelect,
  addVehicle,
  updateVehicle,
  deleteVehicle,
} = vehicles;

// Re-export everything from containers module
export const {
  mockContainers,
  getContainerTypes,
  getContainerTypesForSelect,
  addContainerType,
  updateContainerType,
  deleteContainerType,
} = containers;

// Re-export everything from employees module
export const {
  employeeRoles,
  mockEmployeesOld,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} = employees;

// Re-export everything from customers module
export const {
  getCustomers,
  getCustomersForSelect,
  addCustomer,
  updateCustomer,
  deleteCustomer,
} = customers;

// Re-export everything from partners module
export const {
  getPartners,
  getPartnersForSelect,
  addPartner,
  updatePartner,
  deletePartner,
} = partners;

// Re-export everything from cost rates module
export const {
  getCostRates,
  addCostRate,
  updateCostRate,
  deleteCostRate,
} = costRates;

// Re-export everything from shipment plans module
export const {
  mockSchedules,
  mockCosts,
  getShipmentPlans,
  addShipmentPlan,
  updateShipmentPlan,
  deleteShipmentPlan,
  updateShipmentPlanField,
  addDetailedOtherCostItem,
  updateDetailedOtherCostItem,
  deleteDetailedOtherCostItem,
} = shipmentPlans;

// Re-export everything from reports module
export const {
  monthlyProfitRevenueData,
  costReportData,
  revenueTrackingData,
  debtReportData,
  financialReportData,
  getMonthlyProfitAndRevenueReport,
  getDetailedCostReport,
  getRevenueTrackingReport,
  getDebtReport,
  getFinancialReport,
  getAvailableMonthsForReport,
  getVehicleMonthlyDetailsReport,
} = reports;

// Re-export everything from fuel standards module
export const {
  getFuelStandards,
  getLicensePlatesForFuelStandards,
  addFuelStandard,
  updateFuelStandard,
  deleteFuelStandard,
} = fuelStandards;

// Legacy exports for backward compatibility
export const mockEmployees = employees.mockEmployeesOld;

// Legacy mockData object for backward compatibility
export const mockData = {
  users,
  vehicles: vehicles.mockVehicles,
  containers: containers.mockContainers,
  employees: employees.mockEmployeesOld,
  schedules: shipmentPlans.mockSchedules,
  costs: shipmentPlans.mockCosts,
};

// Additional utility function that was in original file
export function getMonthlyProfitAndRevenueReportLegacy() {
  return new Promise(resolve => {
    setTimeout(() => {
      const currentDate = new Date();
      const data = [];

      // Generate data for the last 12 months
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Generate random but realistic values
        const revenue = Math.floor(Math.random() * 500000000) + 100000000; // 100M - 600M
        const profit = Math.floor(Math.random() * 200000000) - 50000000; // -50M to 150M

        data.push({
          monthYear,
          revenue,
          profit,
        });
      }

      resolve(data);
    }, 100);
  });
}
