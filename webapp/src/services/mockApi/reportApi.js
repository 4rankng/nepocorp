// Mock API services for Reports
import * as reportDataService from '../mockData/reports';

const SIMULATED_DELAY = 0; // ms

const simulateApiCall = (fn) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        console.error('Mock API Error (Reports):', error);
        reject(error);
      }
    }, SIMULATED_DELAY);
  });
};

// Financial reports
export const fetchMonthlyProfitAndRevenueReport = (startDate, endDate) => {
  console.log('[Mock API] Fetching monthly profit and revenue report...', { startDate, endDate });
  return simulateApiCall(() => reportDataService.getMonthlyProfitAndRevenueReport(startDate, endDate));
};

export const fetchDetailedCostReport = (startDate, endDate) => {
  console.log('[Mock API] Fetching detailed cost report...', { startDate, endDate });
  return simulateApiCall(() => reportDataService.getDetailedCostReport(startDate, endDate));
};

export const fetchDebtReport = (startDate, endDate) => {
  console.log('[Mock API] Fetching debt report...', { startDate, endDate });
  return simulateApiCall(() => reportDataService.getDebtReport(startDate, endDate));
};

// Vehicle tracking reports
export const fetchVehicleMonthlyDetailsReport = (vehicleId, monthYear) => {
  console.log('[Mock API] Fetching vehicle monthly details report...', { vehicleId, monthYear });
  return simulateApiCall(() => reportDataService.getVehicleMonthlyDetailsReport(vehicleId, monthYear));
};

export const fetchAvailableMonthsForReport = () => {
  console.log('[Mock API] Fetching available months for reports...');
  return simulateApiCall(() => reportDataService.getAvailableMonthsForReport());
};

// Additional report types
export const fetchDailyRevenueReport = (startDate, endDate) => {
  console.log('[Mock API] Fetching daily revenue report...', { startDate, endDate });
  return simulateApiCall(() => reportDataService.getDailyRevenueReport(startDate, endDate));
};

export const fetchCustomerRevenueReport = (customerId, startDate, endDate) => {
  console.log('[Mock API] Fetching customer revenue report...', { customerId, startDate, endDate });
  return simulateApiCall(() => reportDataService.getCustomerRevenueReport(customerId, startDate, endDate));
};

export const fetchVehiclePerformanceReport = (vehicleId, startDate, endDate) => {
  console.log('[Mock API] Fetching vehicle performance report...', { vehicleId, startDate, endDate });
  return simulateApiCall(() => reportDataService.getVehiclePerformanceReport(vehicleId, startDate, endDate));
};

export const fetchPartnerReport = (partnerId, startDate, endDate) => {
  console.log('[Mock API] Fetching partner report...', { partnerId, startDate, endDate });
  return simulateApiCall(() => reportDataService.getPartnerReport(partnerId, startDate, endDate));
};

// Export report functionality
export const exportReportToExcel = (reportType, reportData, filename) => {
  console.log('[Mock API] Exporting report to Excel...', { reportType, filename });
  return simulateApiCall(() => reportDataService.exportReportToExcel(reportType, reportData, filename));
};

export const exportReportToPDF = (reportType, reportData, filename) => {
  console.log('[Mock API] Exporting report to PDF...', { reportType, filename });
  return simulateApiCall(() => reportDataService.exportReportToPDF(reportType, reportData, filename));
};

console.log('Report Mock API service loaded and configured.');
