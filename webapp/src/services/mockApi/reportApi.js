// Mock API services for Reports
import * as reportDataService from '../mockData/reports.js';
const SIMULATED_DELAY = 0; // ms
const simulateApiCall = fn => {
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
export const fetchMonthlyProfitAndRevenueReport = (_startDate, endDate) => {
  return simulateApiCall(() =>
    reportDataService.getMonthlyProfitAndRevenueReport(_startDate, endDate)
  );
};
export const fetchDetailedCostReport = (_startDate, endDate) => {
  return simulateApiCall(() => reportDataService.getDetailedCostReport(_startDate, endDate));
};
export const fetchDebtReport = (_startDate, endDate) => {
  return simulateApiCall(() => reportDataService.getDebtReport(_startDate, endDate));
};
// Vehicle tracking reports
export const fetchVehicleMonthlyDetailsReport = (vehicleId, monthYear) => {
  return simulateApiCall(() =>
    reportDataService.getVehicleMonthlyDetailsReport(vehicleId, monthYear)
  );
};
export const fetchAvailableMonthsForReport = () => {
  return simulateApiCall(() => reportDataService.getAvailableMonthsForReport());
};
// Additional report types
export const fetchDailyRevenueReport = (_startDate, endDate) => {
  return simulateApiCall(() => reportDataService.getDailyRevenueReport(_startDate, endDate));
};
export const fetchCustomerRevenueReport = (customerId, _startDate, endDate) => {
  console.log('[Mock API] Fetching customer revenue report...', {
    customerId,
    _startDate,
    endDate,
  });
  return simulateApiCall(() =>
    reportDataService.getCustomerRevenueReport(customerId, _startDate, endDate)
  );
};
export const fetchVehiclePerformanceReport = (vehicleId, _startDate, endDate) => {
  console.log('[Mock API] Fetching vehicle performance report...', {
    vehicleId,
    _startDate,
    endDate,
  });
  return simulateApiCall(() =>
    reportDataService.getVehiclePerformanceReport(vehicleId, _startDate, endDate)
  );
};
export const fetchPartnerReport = (partnerId, _startDate, endDate) => {
  return simulateApiCall(() => reportDataService.getPartnerReport(partnerId, _startDate, endDate));
};
// Export report functionality
export const exportReportToExcel = (reportType, reportData, filename) => {
  return simulateApiCall(() =>
    reportDataService.exportReportToExcel(reportType, reportData, filename)
  );
};
export const exportReportToPDF = (reportType, reportData, filename) => {
  return simulateApiCall(() =>
    reportDataService.exportReportToPDF(reportType, reportData, filename)
  );
};
