// Modular mock data - New structure
//
// This file has been refactored into separate modules for better maintainability:
//
// /services/mockData/
// ├── auth.js              - Authentication and user management
// ├── vehicles.js          - Vehicle management
// ├── containers.js        - Container types management
// ├── employees.js         - Employee management
// ├── customers.js         - Customer management
// ├── partners.js          - Partner management
// ├── costRates.js         - Cost rates management
// ├── shipmentPlans.js     - Shipment plans management
// ├── reports.js           - All reports data and functions
// ├── fuelStandards.js     - Fuel standards management
// └── index.js             - Main index that re-exports everything
//
// All existing exports are preserved for backward compatibility

// Re-export everything from the new modular structure
export * from '@services/mockData';
