// Mock API services for Reports
import * as reportDataService from '../mockData/reports.js';
import { mockApiCall, withSingleItem, ErrorCodes } from './apiWrapper.js';
// Financial reports
export const fetchMonthlyProfitAndRevenueReport = (_startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getMonthlyProfitAndRevenueReport(_startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo'
    ),
    'Reports'
  );
};
export const fetchDetailedCostReport = (_startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getDetailedCostReport(_startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo chi phí'
    ),
    'Reports'
  );
};
export const fetchDebtReport = (_startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getDebtReport(_startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo công nợ'
    ),
    'Reports'
  );
};
// Vehicle tracking reports
export const fetchVehicleMonthlyDetailsReport = (vehicleId, monthYear) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getVehicleMonthlyDetailsReport(vehicleId, monthYear),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo xe'
    ),
    'Reports'
  );
};
export const fetchAvailableMonthsForReport = () => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getAvailableMonthsForReport(),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu tháng báo cáo'
    ),
    'Reports'
  );
};
// Additional report types
export const fetchDailyRevenueReport = (_startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getDailyRevenueReport(_startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo doanh thu'
    ),
    'Reports'
  );
};
export const fetchCustomerRevenueReport = (customerId, _startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getCustomerRevenueReport(customerId, _startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo khách hàng'
    ),
    'Reports'
  );
};
export const fetchVehiclePerformanceReport = (vehicleId, _startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getVehiclePerformanceReport(vehicleId, _startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo hiệu suất xe'
    ),
    'Reports'
  );
};
export const fetchPartnerReport = (partnerId, _startDate, endDate) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.getPartnerReport(partnerId, _startDate, endDate),
      ErrorCodes.NOT_FOUND,
      'Không tìm thấy dữ liệu báo cáo đối tác'
    ),
    'Reports'
  );
};
// Export report functionality
export const exportReportToExcel = (reportType, reportData, filename) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.exportReportToExcel(reportType, reportData, filename),
      ErrorCodes.VALIDATION_ERROR,
      'Lỗi xuất báo cáo Excel'
    ),
    'Reports'
  );
};
export const exportReportToPDF = (reportType, reportData, filename) => {
  return mockApiCall(
    withSingleItem(
      () => reportDataService.exportReportToPDF(reportType, reportData, filename),
      ErrorCodes.VALIDATION_ERROR,
      'Lỗi xuất báo cáo PDF'
    ),
    'Reports'
  );
};
