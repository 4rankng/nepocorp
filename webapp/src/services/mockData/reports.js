// Mock reports data for testing and development
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Helper function to generate random data
const generateRandomAmount = (min = 1000000, max = 50000000) => {
  return Math.floor(Math.random() * (max - min) + min);
};

const generateRandomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Sample vehicle data
const sampleVehicles = [
  { id: 1, bienSoXe: '15C-070.63' },
  { id: 2, bienSoXe: '15C-136.31' },
  { id: 3, bienSoXe: '15C-139.82' },
  { id: 4, bienSoXe: '15C-180.99' },
];

// Sample customers and partners
const sampleEntities = [
  { id: 1, name: 'Công ty TNHH ABC', type: 'customer' },
  { id: 2, name: 'Công ty CP XYZ', type: 'customer' },
  { id: 3, name: 'Đối tác vận tải DEF', type: 'partner' },
  { id: 4, name: 'Khách hàng cá nhân GHI', type: 'customer' },
];

// Cost categories
const costCategories = [
  'Nhiên liệu',
  'Bảo dưỡng',
  'Sửa chữa',
  'Phí đường bộ',
  'Bảo hiểm',
  'Lương tài xế',
  'Chi phí khác',
];

// Generate months for the last 12 months
const generateLastNMonths = (n = 12) => {
  const months = [];
  for (let i = 0; i < n; i++) {
    const date = subMonths(new Date(), i);
    months.unshift(format(date, 'MM/yyyy'));
  }
  return months;
};

// Monthly Profit and Revenue Report
export const getMonthlyProfitAndRevenueReport = (_startDate, _endDate) => {
  const months = generateLastNMonths(12);

  return months.map(monthYear => {
    const revenue = generateRandomAmount(20000000, 80000000);
    const costs = generateRandomAmount(15000000, 60000000);
    const profit = revenue - costs;

    return {
      monthYear,
      revenue,
      costs,
      profit,
      profitMargin: ((profit / revenue) * 100).toFixed(2),
    };
  });
};

// Detailed Cost Report
export const getDetailedCostReport = (_startDate, _endDate) => {
  const months = generateLastNMonths(6);
  const data = [];

  months.forEach(monthYear => {
    sampleVehicles.forEach(vehicle => {
      costCategories.forEach(category => {
        // Not every vehicle has every cost type every month
        if (Math.random() > 0.3) {
          data.push({
            monthYear,
            bienSoXe: vehicle.bienSoXe,
            category,
            amount: generateRandomAmount(500000, 5000000),
            vehicleId: vehicle.id,
          });
        }
      });
    });
  });

  return data;
};

// Debt Report
export const getDebtReport = (_startDate, _endDate) => {
  return sampleEntities.map(entity => {
    const totalDebt = generateRandomAmount(1000000, 20000000);
    const overdueDebt = Math.random() > 0.5 ? generateRandomAmount(0, totalDebt * 0.6) : 0;

    return {
      entityId: entity.id,
      entityName: entity.name,
      entityType: entity.type,
      totalDebt,
      overdueDebt,
      currentDebt: totalDebt - overdueDebt,
      lastPaymentDate: format(
        generateRandomDate(subMonths(new Date(), 3), new Date()),
        'dd/MM/yyyy'
      ),
      daysOverdue: overdueDebt > 0 ? Math.floor(Math.random() * 90) + 1 : 0,
    };
  });
};

// Vehicle Monthly Details Report
export const getVehicleMonthlyDetailsReport = (vehicleId, monthYear) => {
  if (!vehicleId || !monthYear) {
    return null;
  }

  const vehicle = sampleVehicles.find(v => v.id === parseInt(vehicleId));
  if (!vehicle) {
    return null;
  }

  const revenue = generateRandomAmount(15000000, 40000000);
  const totalCosts = generateRandomAmount(8000000, 25000000);

  // Generate cost breakdown
  const costBreakdown = costCategories.map(category => ({
    category,
    amount: generateRandomAmount(200000, 4000000),
  }));

  // Generate trip details
  const trips = Array.from({ length: Math.floor(Math.random() * 15) + 5 }, (_, index) => ({
    tripId: `T${monthYear.replace('/', '')}-${vehicle.bienSoXe}-${String(index + 1).padStart(3, '0')}`,
    date: format(
      generateRandomDate(
        startOfMonth(new Date(`${monthYear.split('/')[1]}-${monthYear.split('/')[0]}-01`)),
        endOfMonth(new Date(`${monthYear.split('/')[1]}-${monthYear.split('/')[0]}-01`))
      ),
      'dd/MM/yyyy'
    ),
    customer: sampleEntities[Math.floor(Math.random() * sampleEntities.length)].name,
    route: `Hà Nội - TP.HCM`,
    revenue: generateRandomAmount(1000000, 5000000),
    distance: Math.floor(Math.random() * 1000) + 200,
  }));

  return {
    vehicleId: vehicle.id,
    bienSoXe: vehicle.bienSoXe,
    monthYear,
    revenue,
    totalCosts,
    profit: revenue - totalCosts,
    profitMargin: (((revenue - totalCosts) / revenue) * 100).toFixed(2),
    costBreakdown,
    trips,
    totalTrips: trips.length,
    totalDistance: trips.reduce((sum, trip) => sum + trip.distance, 0),
    avgRevenuePerTrip: (revenue / trips.length).toFixed(0),
  };
};

// Available Months for Reports
export const getAvailableMonthsForReport = () => {
  return generateLastNMonths(12).map(monthYear => ({
    value: monthYear,
    label: monthYear,
  }));
};

// Daily Revenue Report
export const getDailyRevenueReport = (startDate, endDate) => {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      date: format(new Date(d), 'dd/MM/yyyy'),
      revenue: generateRandomAmount(1000000, 8000000),
      trips: Math.floor(Math.random() * 10) + 1,
    });
  }

  return days;
};

// Customer Revenue Report
export const getCustomerRevenueReport = (customerId, _startDate, _endDate) => {
  const customer = sampleEntities.find(e => e.id === parseInt(customerId) && e.type === 'customer');
  if (!customer) {
    return [];
  }

  const months = generateLastNMonths(6);

  return months
    .map(monthYear => ({
      customerId: customer.id,
      customerName: customer.name,
      monthYear,
      revenue: generateRandomAmount(2000000, 15000000),
      trips: Math.floor(Math.random() * 20) + 5,
      avgRevenuePerTrip: 0, // Will be calculated
    }))
    .map(item => ({
      ...item,
      avgRevenuePerTrip: (item.revenue / item.trips).toFixed(0),
    }));
};

// Vehicle Performance Report
export const getVehiclePerformanceReport = (vehicleId, _startDate, _endDate) => {
  const vehicle = sampleVehicles.find(v => v.id === parseInt(vehicleId));
  if (!vehicle) {
    return [];
  }

  const months = generateLastNMonths(6);

  return months.map(monthYear => {
    const trips = Math.floor(Math.random() * 20) + 5;
    const distance = Math.floor(Math.random() * 10000) + 2000;
    const revenue = generateRandomAmount(5000000, 25000000);
    const costs = generateRandomAmount(3000000, 18000000);

    return {
      vehicleId: vehicle.id,
      bienSoXe: vehicle.bienSoXe,
      monthYear,
      trips,
      totalDistance: distance,
      revenue,
      costs,
      profit: revenue - costs,
      fuelEfficiency: (distance / ((costs * 0.3) / 25000)).toFixed(2), // Rough calculation
      utilizationRate: ((trips / 30) * 100).toFixed(1), // Trips per month
    };
  });
};

// Partner Report
export const getPartnerReport = (partnerId, _startDate, _endDate) => {
  const partner = sampleEntities.find(e => e.id === parseInt(partnerId) && e.type === 'partner');
  if (!partner) {
    return [];
  }

  const months = generateLastNMonths(6);

  return months
    .map(monthYear => ({
      partnerId: partner.id,
      partnerName: partner.name,
      monthYear,
      totalPaid: generateRandomAmount(5000000, 30000000),
      trips: Math.floor(Math.random() * 15) + 3,
      avgPaymentPerTrip: 0, // Will be calculated
    }))
    .map(item => ({
      ...item,
      avgPaymentPerTrip: (item.totalPaid / item.trips).toFixed(0),
    }));
};

// Export functions (mock implementations)
export const exportReportToExcel = async (reportType, reportData, filename) => {
  // In a real implementation, this would generate and download an Excel file
  return Promise.resolve({
    success: true,
    filename,
    url: `mock-export/${filename}.xlsx`,
  });
};

export const exportReportToPDF = async (reportType, reportData, filename) => {
  // In a real implementation, this would generate and download a PDF file
  return Promise.resolve({
    success: true,
    filename,
    url: `mock-export/${filename}.pdf`,
  });
};
