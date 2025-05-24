// Reports mock data and functions

// Monthly profit and revenue report data
export const monthlyProfitRevenueData = [
  {
    id: 'pr1',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    revenue: 25000000,
    costs: 12500000,
    profit: 12500000,
  },
  {
    id: 'pr2',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    revenue: 35000000,
    costs: 18500000,
    profit: 16500000,
  },
  {
    id: 'pr3',
    monthYear: '2024-02',
    bienSoXe: '51C-12345',
    revenue: 28000000,
    costs: 14000000,
    profit: 14000000,
  },
  {
    id: 'pr4',
    monthYear: '2024-02',
    bienSoXe: '29H-67890',
    revenue: 32000000,
    costs: 16800000,
    profit: 15200000,
  },
  {
    id: 'pr5',
    monthYear: '2024-03',
    bienSoXe: '51C-12345',
    revenue: 30000000,
    costs: 15500000,
    profit: 14500000,
  },
  {
    id: 'pr6',
    monthYear: '2024-03',
    bienSoXe: '29H-67890',
    revenue: 38000000,
    costs: 20000000,
    profit: 18000000,
  },
  {
    id: 'pr7',
    monthYear: '2024-04',
    bienSoXe: '51C-12345',
    revenue: 27000000,
    costs: 13800000,
    profit: 13200000,
  },
  {
    id: 'pr8',
    monthYear: '2024-04',
    bienSoXe: '29H-67890',
    revenue: 33000000,
    costs: 17800000,
    profit: 15200000,
  },
  {
    id: 'pr9',
    monthYear: '2024-05',
    bienSoXe: '51C-12345',
    revenue: 29000000,
    costs: 14700000,
    profit: 14300000,
  },
  {
    id: 'pr10',
    monthYear: '2024-05',
    bienSoXe: '29H-67890',
    revenue: 36000000,
    costs: 19200000,
    profit: 16800000,
  },
];

// Cost report data
export const costReportData = [
  {
    id: 'cr1',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Nhiên liệu',
    amount: 8000000,
  },
  {
    id: 'cr2',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Bảo trì',
    amount: 2000000,
  },
  {
    id: 'cr3',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Phí đường bộ',
    amount: 1500000,
  },
  {
    id: 'cr4',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Chi phí khác',
    amount: 1000000,
  },
  {
    id: 'cr5',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Nhiên liệu',
    amount: 12000000,
  },
  {
    id: 'cr6',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Bảo trì',
    amount: 3000000,
  },
  {
    id: 'cr7',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Phí đường bộ',
    amount: 2000000,
  },
  {
    id: 'cr8',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Chi phí khác',
    amount: 1500000,
  },
  {
    id: 'cr9',
    monthYear: '2024-02',
    bienSoXe: '51C-12345',
    category: 'Nhiên liệu',
    amount: 9000000,
  },
  {
    id: 'cr10',
    monthYear: '2024-02',
    bienSoXe: '51C-12345',
    category: 'Bảo trì',
    amount: 2500000,
  },
];

// Revenue tracking data
export const revenueTrackingData = [
  {
    id: 'rt1',
    date: '2024-01-01',
    description: 'Vận chuyển hàng từ HCM đến HN',
    containerCount: 2,
    route: 'HCM - HN',
    fuelLiters: 150,
    fuelPrice: 25000,
    roadCost: 500000,
    totalCost: 4250000,
    transportFee: 8000000,
    profit: 3750000,
  },
  {
    id: 'rt2',
    date: '2024-01-05',
    description: 'Vận chuyển hàng từ HN đến Hải Phòng',
    containerCount: 1,
    route: 'HN - HP',
    fuelLiters: 80,
    fuelPrice: 25000,
    roadCost: 200000,
    totalCost: 2200000,
    transportFee: 4500000,
    profit: 2300000,
  },
  {
    id: 'rt3',
    date: '2024-01-10',
    description: 'Vận chuyển hàng từ Đà Nẵng đến HCM',
    containerCount: 3,
    route: 'DN - HCM',
    fuelLiters: 200,
    fuelPrice: 25000,
    roadCost: 800000,
    totalCost: 5800000,
    transportFee: 12000000,
    profit: 6200000,
  },
  {
    id: 'rt4',
    date: '2024-01-15',
    description: 'Vận chuyển hàng từ HCM đến Cần Thơ',
    containerCount: 1,
    route: 'HCM - CT',
    fuelLiters: 70,
    fuelPrice: 25000,
    roadCost: 150000,
    totalCost: 1900000,
    transportFee: 4000000,
    profit: 2100000,
  },
  {
    id: 'rt5',
    date: '2024-01-20',
    description: 'Vận chuyển hàng từ Hải Phòng đến HN',
    containerCount: 2,
    route: 'HP - HN',
    fuelLiters: 90,
    fuelPrice: 25000,
    roadCost: 250000,
    totalCost: 2500000,
    transportFee: 5500000,
    profit: 3000000,
  },
];

// Debt report data
export const debtReportData = [
  {
    id: 'debt1',
    entityName: 'Công ty TNHH ABC Vận Tải',
    entityType: 'customer',
    monthYear: '2024-01',
    phaiThu: 15000000,
    phaiTra: 0,
    ghiChu: 'Thanh toán đúng hạn',
  },
  {
    id: 'debt2',
    entityName: 'Đối tác Vận Tải An Phát',
    entityType: 'partner',
    monthYear: '2024-01',
    phaiThu: 0,
    phaiTra: 5000000,
    ghiChu: 'Đã thanh toán 1 phần',
  },
  {
    id: 'debt3',
    entityName: 'Doanh nghiệp tư nhân XYZ Logistics',
    entityType: 'customer',
    monthYear: '2024-01',
    phaiThu: 8000000,
    phaiTra: 0,
    ghiChu: 'Chậm thanh toán',
  },
  {
    id: 'debt4',
    entityName: 'Công ty Logistics Toàn Cầu',
    entityType: 'partner',
    monthYear: '2024-02',
    phaiThu: 2000000,
    phaiTra: 12000000,
    ghiChu: '',
  },
];

// Financial report data
export const financialReportData = [
  {
    id: 'fr1',
    period: '2024-Q1',
    totalRevenue: 150000000,
    totalCosts: 85000000,
    totalProfit: 65000000,
    operatingExpenses: 12000000,
    netProfit: 53000000,
  },
  {
    id: 'fr2',
    period: '2024-Q2',
    totalRevenue: 180000000,
    totalCosts: 102000000,
    totalProfit: 78000000,
    operatingExpenses: 15000000,
    netProfit: 63000000,
  },
];

// Report functions
export const getMonthlyProfitAndRevenueReport = (filters = {}) =>
  new Promise(res => {
    let filteredData = monthlyProfitRevenueData;

    if (filters.monthYear) {
      filteredData = filteredData.filter(item => item.monthYear === filters.monthYear);
    }

    if (filters.bienSoXe) {
      filteredData = filteredData.filter(item => item.bienSoXe === filters.bienSoXe);
    }

    setTimeout(() => res(filteredData), 50);
  });

export const getDetailedCostReport = (filters = {}) =>
  new Promise(res => {
    let filteredData = costReportData;

    if (filters.monthYear) {
      filteredData = filteredData.filter(item => item.monthYear === filters.monthYear);
    }

    if (filters.bienSoXe) {
      filteredData = filteredData.filter(item => item.bienSoXe === filters.bienSoXe);
    }

    if (filters.category) {
      filteredData = filteredData.filter(item => item.category === filters.category);
    }

    setTimeout(() => res(filteredData), 50);
  });

export const getRevenueTrackingReport = (filters = {}) =>
  new Promise(res => {
    let filteredData = revenueTrackingData;

    if (filters.startDate && filters.endDate) {
      filteredData = filteredData.filter(
        item => item.date >= filters.startDate && item.date <= filters.endDate
      );
    }

    if (filters.route) {
      filteredData = filteredData.filter(item =>
        item.route.toLowerCase().includes(filters.route.toLowerCase())
      );
    }

    setTimeout(() => res(filteredData), 50);
  });

export const getDebtReport = (filters = {}) =>
  new Promise(res => {
    let filteredData = debtReportData;

    if (filters.monthYear) {
      filteredData = filteredData.filter(item => item.monthYear === filters.monthYear);
    }

    if (filters.entityType) {
      filteredData = filteredData.filter(item => item.entityType === filters.entityType);
    }

    setTimeout(() => res(filteredData), 50);
  });

export const getFinancialReport = (filters = {}) =>
  new Promise(res => {
    let filteredData = financialReportData;

    if (filters.period) {
      filteredData = filteredData.filter(item => item.period === filters.period);
    }

    setTimeout(() => res(filteredData), 50);
  });

// Get available months for report from shipment plans data
export const getAvailableMonthsForReport = () => {
  return new Promise(resolve => {
    // Import shipmentPlansData and otherVehicleCostsData from their respective modules
    // For now, create some demo months
    const demoMonths = [
      { label: '12/2024', value: '2024-12' },
      { label: '11/2024', value: '2024-11' },
      { label: '10/2024', value: '2024-10' },
      { label: '09/2024', value: '2024-09' },
      { label: '08/2024', value: '2024-08' },
      { label: '07/2024', value: '2024-07' },
      { label: '06/2024', value: '2024-06' },
    ];
    setTimeout(() => resolve(demoMonths), 50);
  });
};

// Get vehicle monthly details report
export const getVehicleMonthlyDetailsReport = (vehicleId, monthYear) => {
  return new Promise(resolve => {
    setTimeout(() => {
      const data = [];

      // Generate data for 10-15 trips per vehicle per month
      const numTrips = Math.floor(Math.random() * 6) + 10; // 10-15 trips

      // Sample routes with longer descriptions
      const routes = [
        'Kho Cảng Cát Lái - Khu Công Nghiệp Mỹ Phước 3 - Khu Công Nghiệp Mỹ Phước 4',
        'Cảng Hải Phòng - Khu Công Nghiệp Đình Vũ - Khu Công Nghiệp Nomura',
        'Kho Cảng Tân Cảng - Khu Công Nghiệp Long Thành - Khu Công Nghiệp Nhơn Trạch',
        'Cảng Đà Nẵng - Khu Công Nghiệp Hòa Khánh - Khu Công Nghiệp Liên Chiểu',
        'Kho Cảng Sài Gòn - Khu Công Nghiệp Vĩnh Lộc - Khu Công Nghiệp Tân Tạo',
        'Cảng Cái Mép - Khu Công Nghiệp Phú Mỹ 1 - Khu Công Nghiệp Phú Mỹ 2',
        'Kho Cảng Vũng Tàu - Khu Công Nghiệp Đồng Nai - Khu Công Nghiệp Amata',
        'Cảng Quy Nhơn - Khu Công Nghiệp Nhơn Hội - Khu Công Nghiệp Hòa Hội',
        'Kho Cảng Cần Thơ - Khu Công Nghiệp Trà Nóc - Khu Công Nghiệp Hưng Phú',
      ];

      // Generate container numbers
      const generateContainerNumber = () => {
        const prefix = ['CMAU', 'CMCU', 'CMRU', 'CMTU'];
        const randomPrefix = prefix[Math.floor(Math.random() * prefix.length)];
        const number = Math.floor(Math.random() * 1000000)
          .toString()
          .padStart(6, '0');
        const checkDigit = Math.floor(Math.random() * 10);
        return `${randomPrefix}${number}${checkDigit}`;
      };

      for (let i = 0; i < numTrips; i++) {
        const numContainers = Math.floor(Math.random() * 3) + 1; // 1-3 containers per trip
        const containers = Array.from({ length: numContainers }, () => ({
          soContainer: generateContainerNumber(),
          soSeal: `SEAL${Math.floor(Math.random() * 10000)
            .toString()
            .padStart(4, '0')}`,
        }));

        // Add fuelLiters and roadCost
        const fuelLiters = Math.floor(Math.random() * 200) + 50; // 50-249 liters
        const roadCost = Math.floor(Math.random() * 500000) + 100000; // 100k - 599,999 VND

        data.push({
          tripId: `TRIP-${vehicleId}-${i + 1}`,
          date: `${monthYear}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
          route: routes[i % routes.length],
          containers,
          distance: Math.floor(Math.random() * 500) + 100, // 100-600 km
          fuelCost: Math.floor(Math.random() * 5000000) + 1000000, // 1M - 6M
          maintenanceCost: Math.floor(Math.random() * 2000000) + 500000, // 500K - 2.5M
          otherCost: Math.floor(Math.random() * 3000000) + 1000000, // 1M - 4M
          revenue: Math.floor(Math.random() * 10000000) + 5000000, // 5M - 15M
          fuelLiters,
          roadCost,
        });
      }

      resolve(data);
    }, 100);
  });
};
