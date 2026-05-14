/* eslint-disable */
// data.jsx — realistic NEPO mock data lifted from the operational document.
// 4 trucks, 38+ routes, 44+ customers, fuel quotas, profit-share, etc.

const FLEET = [
  { plate: '15C-136.31', type: '40\'', driver: 'Nguyễn Văn Hùng',  phone: '0904 123 456', status: 'running',  loc: 'Mộc Châu, Sơn La' },
  { plate: '15C-139.82', type: '40\'', driver: 'Trần Đình Sơn',    phone: '0936 220 901', status: 'idle',     loc: 'Hải Phòng (depot)' },
  { plate: '15C-180.99', type: '40\'', driver: 'Phạm Quốc Bảo',    phone: '0975 088 412', status: 'running',  loc: 'Quốc lộ 5 — Km42' },
  { plate: '15C-070.63', type: '20\'', driver: 'Lê Minh Quân',     phone: '0938 651 720', status: 'maint',    loc: 'Gara Đông Hải' },
];

// Đơn vị: Lít/100 km
const FUEL_QUOTA = [
  { plate: '15C-136.31', mixHeavy: 34, mixLight: 32, empty: 25, heavy: 43, light: 39, mountain: 3 },
  { plate: '15C-139.82', mixHeavy: 34, mixLight: 32, empty: 25, heavy: 43, light: 39, mountain: 3 },
  { plate: '15C-180.99', mixHeavy: 36, mixLight: 34, empty: 27, heavy: 45, light: 41, mountain: 2 },
  { plate: '15C-070.63', mixHeavy: 33, mixLight: 31, empty: 24, heavy: 42, light: 38, mountain: 3 },
];

const ROUTES = [
  { id: 'R01', from: 'Hải Phòng', to: 'Hà Nội',         km: 102, rate40: 1150000, rate20: 850000,  note: 'Trừ vé QL5' },
  { id: 'R02', from: 'Hải Phòng', to: 'Hưng Yên',       km: 88,  rate40: 1150000, rate20: 850000,  note: 'Trừ vé QL5' },
  { id: 'R03', from: 'Hải Phòng', to: 'Bắc Ninh',       km: 96,  rate40: 790000,  rate20: 620000,  note: 'Trừ vé QL5' },
  { id: 'R04', from: 'Hải Phòng', to: 'Bắc Giang',      km: 112, rate40: 790000,  rate20: 620000,  note: 'Trừ vé QL5' },
  { id: 'R05', from: 'Hải Phòng', to: 'Hải Dương',      km: 68,  rate40: 580000,  rate20: 480000,  note: '' },
  { id: 'R06', from: 'Hải Phòng', to: 'Hà Nam',         km: 138, rate40: 1480000, rate20: 1180000, note: '' },
  { id: 'R07', from: 'Hải Phòng', to: 'Thái Bình',      km: 75,  rate40: 720000,  rate20: 580000,  note: '' },
  { id: 'R08', from: 'Hải Phòng', to: 'Mộc Châu',       km: 312, rate40: 2920000, rate20: 2350000, note: 'Núi +3L' },
  { id: 'R09', from: 'Hải Phòng', to: 'Sơn La',         km: 348, rate40: 2920000, rate20: 2350000, note: 'Núi +3L' },
  { id: 'R10', from: 'Hải Phòng', to: 'Sa Pa',          km: 396, rate40: 5960000, rate20: null,    note: 'Núi xa' },
  { id: 'R11', from: 'Hải Phòng', to: 'Lai Châu',       km: 456, rate40: 6960000, rate20: null,    note: 'Núi cực đoạn' },
  { id: 'R12', from: 'Hải Phòng', to: 'Nội thành',      km: 18,  rate40: 200000,  rate20: 200000,  note: 'Chuyến ngắn' },
];

// Khách hàng — gồm 4 KH top + nhiều KH nhỏ
const CUSTOMERS = [
  { id: 'C001', name: 'Nitoda Logistics',          monogram: 'NT', industry: 'Logistics quốc tế',  contact: 'Mr. Hùng — 0904 821 110', debt: 678000000, ytdRevenue: 1820000000, agingBucket: 'T3', tripsYTD: 142 },
  { id: 'C002', name: 'Tân Việt Hưng',             monogram: 'TV', industry: 'Vận tải · Forwarding', contact: 'Chị Lan — 0936 778 200', debt: 256000000, ytdRevenue: 1180000000, agingBucket: 'T2', tripsYTD: 96 },
  { id: 'C003', name: 'Trà Thu Đan',               monogram: 'TĐ', industry: 'Xuất khẩu chè',       contact: 'Anh Tuấn — 0974 320 911', debt: 240000000, ytdRevenue: 920000000,  agingBucket: 'T4', tripsYTD: 78 },
  { id: 'C004', name: 'Vietsun Container',         monogram: 'VS', industry: 'Hãng tàu',            contact: 'Mr. Long — 0903 511 008', debt: 175000000, ytdRevenue: 1450000000, agingBucket: 'T1', tripsYTD: 124 },
  { id: 'C005', name: 'Phú Cường Logistics',       monogram: 'PC', industry: 'Forwarding',          contact: 'Chị Hoa — 0987 230 411', debt: 95000000,  ytdRevenue: 540000000,  agingBucket: 'T2', tripsYTD: 48 },
  { id: 'C006', name: 'Đại Phú Xuyên',             monogram: 'ĐP', industry: 'Xuất nhập khẩu',      contact: 'Anh Đức — 0916 882 117', debt: 78000000,  ytdRevenue: 380000000,  agingBucket: 'T1', tripsYTD: 32 },
  { id: 'C007', name: 'Hoàng Gia Phát',            monogram: 'HG', industry: 'Sản xuất nông sản',   contact: 'Mr. Bình — 0987 410 215', debt: 64000000,  ytdRevenue: 290000000,  agingBucket: 'T1', tripsYTD: 28 },
  { id: 'C008', name: 'Trường Thịnh Cont',         monogram: 'TT', industry: 'Cho thuê cont',       contact: 'Anh Phong — 0938 622 401', debt: 52000000,  ytdRevenue: 410000000,  agingBucket: 'T1', tripsYTD: 41 },
  { id: 'C009', name: 'Vinacomin Hải Phòng',       monogram: 'VC', industry: 'Khoáng sản',          contact: 'Chị Mai — 0904 730 116', debt: 48000000,  ytdRevenue: 320000000,  agingBucket: 'T2', tripsYTD: 35 },
  { id: 'C010', name: 'Sao Mai Container',         monogram: 'SM', industry: 'Vận tải biển',        contact: 'Anh Hoàng — 0987 113 320', debt: 38000000,  ytdRevenue: 260000000,  agingBucket: 'T1', tripsYTD: 26 },
  { id: 'C011', name: 'Việt Anh Trading',          monogram: 'VA', industry: 'Thương mại',          contact: 'Chị Hà — 0938 220 419', debt: 32000000,  ytdRevenue: 180000000,  agingBucket: 'T1', tripsYTD: 22 },
  { id: 'C012', name: 'Hải Việt Logistics',        monogram: 'HV', industry: 'Logistics nội địa',   contact: 'Mr. Sơn — 0903 880 416', debt: 27000000,  ytdRevenue: 215000000,  agingBucket: 'T1', tripsYTD: 24 },
  { id: 'C013', name: 'Mạnh Tiến Phát',            monogram: 'MT', industry: 'Phân phối',           contact: 'Anh Dũng — 0916 470 822', debt: 22000000,  ytdRevenue: 145000000,  agingBucket: 'T1', tripsYTD: 17 },
  { id: 'C014', name: 'Phương Đông Cont',          monogram: 'PĐ', industry: 'Forwarding',          contact: 'Chị Loan — 0987 661 215', debt: 18000000,  ytdRevenue: 132000000,  agingBucket: 'T1', tripsYTD: 15 },
  { id: 'C015', name: 'An Phú Logistics',          monogram: 'AP', industry: 'Vận tải đa phương',   contact: 'Mr. Việt — 0938 105 219', debt: 16000000,  ytdRevenue: 108000000,  agingBucket: 'T1', tripsYTD: 13 },
  { id: 'C016', name: 'Đông Á Container',          monogram: 'ĐA', industry: 'Cont rỗng',           contact: 'Anh Khánh — 0904 220 718', debt: 0,         ytdRevenue: 88000000,   agingBucket: '—',  tripsYTD: 10 },
  { id: 'C017', name: 'Bình Minh Trading',         monogram: 'BM', industry: 'Thương mại',          contact: 'Chị Hằng — 0916 802 110', debt: 12000000,  ytdRevenue: 76000000,   agingBucket: 'T1', tripsYTD: 9 },
  { id: 'C018', name: 'Hùng Mạnh Cont',            monogram: 'HM', industry: 'Cho thuê cont',       contact: 'Anh Tài — 0987 553 401', debt: 8000000,   ytdRevenue: 64000000,   agingBucket: 'T1', tripsYTD: 7 },
  { id: 'C019', name: 'Hà Nam Logistics',          monogram: 'HN', industry: 'Vận tải đường bộ',    contact: 'Mr. Cường — 0938 770 222', debt: 6000000,   ytdRevenue: 52000000,   agingBucket: 'T1', tripsYTD: 6 },
  { id: 'C020', name: 'Toàn Cầu Cargo',            monogram: 'TC', industry: 'Cargo quốc tế',       contact: 'Chị Hương — 0903 144 815', debt: 4000000,   ytdRevenue: 41000000,   agingBucket: 'T1', tripsYTD: 5 },
];

// Trips - 12 representative recent trips
const TRIPS = [
  { id: 'T2604-018', date: '26/04', plate: '15C-180.99', driver: 'Phạm Quốc Bảo', route: ['Hải Phòng', 'Hà Nội'],    km: 102, fuel: 36, ttbq: 35.3, customer: 'Nitoda Logistics',      cargo: 'Hàng chung',  containerNo: 'HLBU 4490371', revenue: 1150000, cost: 920000,  fuelCost: 674280,  allowance: 1150000, status: 'done',    warning: null },
  { id: 'T2604-017', date: '26/04', plate: '15C-139.82', driver: 'Trần Đình Sơn',  route: ['Hải Phòng', 'Bắc Ninh'],  km: 96,  fuel: 33, ttbq: 34.4, customer: 'Vietsun Container',     cargo: 'Cont rỗng',   containerNo: 'TGHU 6622019', revenue: 580000,  cost: 750000,  fuelCost: 618090,  allowance: 580000,  status: 'done',    warning: null },
  { id: 'T2604-016', date: '26/04', plate: '15C-070.63', driver: 'Lê Minh Quân',  route: ['Hải Phòng', 'Thái Bình'], km: 75,  fuel: 28, ttbq: 37.3, customer: 'Tân Việt Hưng',         cargo: 'Hàng chung',  containerNo: 'CMAU 2210188', revenue: 720000,  cost: 680000,  fuelCost: 524440,  allowance: 720000,  status: 'done',    warning: 'fuel-over' },
  { id: 'T2604-015', date: '26/04', plate: '15C-136.31', driver: 'Nguyễn Văn Hùng', route: ['Hải Phòng', 'Mộc Châu'], km: 312, fuel: 118, ttbq: 37.8, customer: 'Trà Thu Đan',          cargo: 'Chè xuất khẩu', containerNo: 'MSCU 9907412', revenue: 2920000, cost: 2480000, fuelCost: 2210140, allowance: 2920000, status: 'running', warning: null },
  { id: 'T2504-014', date: '25/04', plate: '15C-180.99', driver: 'Phạm Quốc Bảo', route: ['Hải Phòng', 'Hưng Yên'],  km: 88,  fuel: 32, ttbq: 36.4, customer: 'Phú Cường Logistics',   cargo: 'Hàng chung',  containerNo: 'OOLU 6745021', revenue: 1150000, cost: 890000,  fuelCost: 599360,  allowance: 1150000, status: 'done',    warning: null },
  { id: 'T2504-013', date: '25/04', plate: '15C-139.82', driver: 'Trần Đình Sơn',  route: ['Hải Phòng', 'Hà Nam'],    km: 138, fuel: 47, ttbq: 34.1, customer: 'Nitoda Logistics',      cargo: 'Hàng chung',  containerNo: 'TLLU 1880417', revenue: 1480000, cost: 1240000, fuelCost: 880310,  allowance: 1480000, status: 'done',    warning: null },
  { id: 'T2504-012', date: '25/04', plate: '15C-070.63', driver: 'Lê Minh Quân',  route: ['Hải Phòng', 'Nội thành'], km: 18,  fuel: 7,  ttbq: 38.9, customer: 'Đại Phú Xuyên',         cargo: 'Cont rỗng',   containerNo: 'GESU 5510287', revenue: 200000,  cost: 180000,  fuelCost: 131110,  allowance: 200000,  status: 'done',    warning: null },
  { id: 'T2404-011', date: '24/04', plate: '15C-136.31', driver: 'Nguyễn Văn Hùng', route: ['Hải Phòng', 'Sa Pa'],     km: 396, fuel: 148, ttbq: 37.4, customer: 'Vietsun Container',     cargo: 'Hàng chung',  containerNo: 'MSKU 7710339', revenue: 5960000, cost: 4650000, fuelCost: 2772040, allowance: 5960000, status: 'done',    warning: null },
  { id: 'T2404-010', date: '24/04', plate: '15C-180.99', driver: 'Phạm Quốc Bảo', route: ['Hải Phòng', 'Hà Nội'],    km: 102, fuel: 35, ttbq: 34.3, customer: 'Hoàng Gia Phát',        cargo: 'Hàng chung',  containerNo: 'HMMU 4420118', revenue: 1150000, cost: 880000,  fuelCost: 655550,  allowance: 1150000, status: 'done',    warning: 'no-receipt' },
  { id: 'T2404-009', date: '24/04', plate: '15C-070.63', driver: 'Lê Minh Quân',  route: ['Hải Phòng', 'Bắc Giang'], km: 112, fuel: 41, ttbq: 36.6, customer: 'Trường Thịnh Cont',     cargo: 'Cont rỗng',   containerNo: 'BMOU 8810451', revenue: 620000,  cost: 820000,  fuelCost: 767930,  allowance: 620000,  status: 'done',    warning: null },
  { id: 'T2304-008', date: '23/04', plate: '15C-139.82', driver: 'Trần Đình Sơn',  route: ['Hải Phòng', 'Lai Châu'],  km: 456, fuel: 174, ttbq: 38.2, customer: 'Nitoda Logistics',      cargo: 'Hàng chung',  containerNo: 'ONEU 2210877', revenue: 6960000, cost: 5280000, fuelCost: 3259020, allowance: 6960000, status: 'done',    warning: null },
  { id: 'T2304-007', date: '23/04', plate: '15C-180.99', driver: 'Phạm Quốc Bảo', route: ['Hải Phòng', 'Hải Dương'], km: 68,  fuel: 24, ttbq: 35.3, customer: 'Vinacomin Hải Phòng',   cargo: 'Hàng chung',  containerNo: 'TCKU 6610208', revenue: 580000,  cost: 540000,  fuelCost: 449520,  allowance: 580000,  status: 'done',    warning: null },
];

// Monthly P&L numbers for 4 trucks — April 2026 (in VND, millions for display)
const PNL_APRIL = [
  { plate: '15C-136.31', trips: 28, km:  6420, revenue: 412800000, fuelCost: 188660000, allowance:  98200000, salary:  72400000, repair: 12300000, tires:  6800000, oilFilter: 4400000 },
  { plate: '15C-139.82', trips: 32, km:  7180, revenue: 388500000, fuelCost: 176320000, allowance:  92800000, salary:  71200000, repair: 10800000, tires:  8200000, oilFilter: 4100000 },
  { plate: '15C-180.99', trips: 36, km:  7820, revenue: 442100000, fuelCost: 211420000, allowance: 104500000, salary:  74800000, repair:  9600000, tires:  7400000, oilFilter: 4900000 },
  { plate: '15C-070.63', trips: 24, km:  5180, revenue: 286900000, fuelCost: 129880000, allowance:  68400000, salary:  68800000, repair: 14200000, tires:  5800000, oilFilter: 3600000 },
];

// 12 tháng doanh thu - chi phí (tỷ đồng)
const MONTHLY_TREND = [
  { m: 'T5/25', rev: 1080, cost: 832, profit: 248 },
  { m: 'T6/25', rev: 1124, cost: 856, profit: 268 },
  { m: 'T7/25', rev: 1192, cost: 901, profit: 291 },
  { m: 'T8/25', rev: 1156, cost: 882, profit: 274 },
  { m: 'T9/25', rev: 1248, cost: 928, profit: 320 },
  { m: 'T10/25', rev: 1318, cost: 968, profit: 350 },
  { m: 'T11/25', rev: 1402, cost: 1014, profit: 388 },
  { m: 'T12/25', rev: 1488, cost: 1056, profit: 432 },
  { m: 'T1/26', rev: 1306, cost: 982, profit: 324 },
  { m: 'T2/26', rev: 1268, cost: 956, profit: 312 },
  { m: 'T3/26', rev: 1442, cost: 1042, profit: 400 },
  { m: 'T4/26', rev: 1530, cost: 1098, profit: 432 },
];

// Partners (vốn góp)
const PARTNERS = [
  { name: 'Ông Phụng',   pct: 70.45 },
  { name: 'Ông Thưởng',  pct: 29.55 },
];

const formatCurrency = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' ₫';
const formatCompact = (n) => {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs >= 1000000000) return sign + (abs / 1000000000).toFixed(2) + ' tỷ';
  if (abs >= 1000000) return sign + (abs / 1000000).toFixed(abs >= 10000000 ? 0 : 1) + ' tr';
  if (abs >= 1000) return sign + Math.round(abs / 1000) + ' k';
  return sign + String(abs);
};
const formatNumber = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n));

Object.assign(window, { FLEET, FUEL_QUOTA, ROUTES, CUSTOMERS, TRIPS, PNL_APRIL, MONTHLY_TREND, PARTNERS, formatCurrency, formatCompact, formatNumber });
