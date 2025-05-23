// Mock user data
export const users = {
  quanly: {
    username: 'quanly',
    password: 'password123',
    role: 'quanly',
    fullName: 'Quản Lý Hệ Thống',
  },
  ketoan: {
    username: 'ketoan',
    password: 'password123',
    role: 'ketoan',
    fullName: 'Kế Toán Viên',
  },
  giaonhan: {
    username: 'giaonhan',
    password: 'password123',
    role: 'giaonhan',
    fullName: 'Nhân Viên Giao Nhận',
  },
  laixe: {
    username: 'laixe',
    password: 'password123',
    role: 'laixe',
    fullName: 'Tài Xế',
  },
};

// Role configurations
export const roles = [
  {
    key: 'quanly',
    label: 'Quản lý',
    color: 'border-gray-200 bg-gray-50 text-gray-500',
    selected: 'bg-red-100 border-red-400 text-black',
  },
  {
    key: 'ketoan',
    label: 'Kế toán',
    color: 'border-gray-200 bg-gray-50 text-gray-500',
    selected: 'bg-yellow-100 border-yellow-400 text-black',
  },
  {
    key: 'giaonhan',
    label: 'Giao Nhận',
    color: 'border-gray-200 bg-gray-50 text-gray-500',
    selected: 'bg-green-100 border-green-400 text-black',
  },
  {
    key: 'laixe',
    label: 'Lái Xe',
    color: 'border-gray-200 bg-gray-50 text-gray-500',
    selected: 'bg-blue-100 border-blue-400 text-black',
  },
];

// Mock data for different roles
export const mockData = {
  quanly: {
    plans: [], // Simplified, main data below
  },
  ketoan: {
    plans: [],
    vehicles: [
      { id: 'V001', bienSo: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
      { id: 'V002', bienSo: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
      { id: 'V003', bienSo: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
    ],
  },
  giaonhan: { schedule: [] },
  laixe: { trips: [] },
  financialReport: [], // Old, will be replaced by new function
};

// Helper function to get user by username
export const getUserByUsername = username => {
  return users[username.toLowerCase()];
};

// Helper function to verify user credentials
export const verifyCredentials = (username, password) => {
  const user = users[username.toLowerCase()];
  return user && user.password === password ? user : null;
};

// Mock data for authentication
export const mockUsers = [
  { id: 'u1', username: 'admin', password: 'admin123', role: 'admin' },
  { id: 'u2', username: 'user', password: 'user123', role: 'user' },
];

// Mock data for vehicles
export const mockVehicles = [
  { id: 'V001', bienSo: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
  { id: 'V002', bienSo: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
  { id: 'V003', bienSo: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
];

// Mock data for containers
export const mockContainers = [
  { id: 'C001', type: '20ft', status: 'available' },
  { id: 'C002', type: '40ft', status: 'in-use' },
];

// Mock data for employees
export const mockEmployeesOld = [
  { id: 'E001', name: 'Nguyễn Văn A', position: 'Lái xe' },
  { id: 'E002', name: 'Trần Thị B', position: 'Kế toán' },
];

// Mock data for schedules and costs
export const mockSchedules = [];
export const mockCosts = [];

// --- START: Container Types Mock Data & Functions ---
let containerTypesData = [
  { id: 'ct1', name: "20'DC" },
  { id: 'ct2', name: "40'DC" },
  { id: 'ct3', name: "40'HC" },
  { id: 'ct4', name: "20'RF" },
  { id: 'ct5', name: "45'HC" },
];
export const getContainerTypes = () =>
  new Promise(res => setTimeout(() => res([...containerTypesData]), 50));
export const getContainerTypesForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(containerTypesData.map(ct => ({ id: ct.id, name: ct.name }))), 50)
  );
const validateContainerTypeData = (name, id = null) => {
  if (!name || name.trim() === '') return 'Tên loại container không được để trống.';
  if (containerTypesData.some(c => c.name === name.trim() && c.id !== id))
    return 'Tên loại container đã tồn tại.';
  return null;
};
export const addContainerType = typeName =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateContainerTypeData(typeName);
      if (err) reject(new Error(err));
      else {
        const newType = { id: String(Date.now()), name: typeName.trim() };
        containerTypesData.push(newType);
        resolve(newType);
      }
    }, 50)
  );
export const updateContainerType = (id, updatedName) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateContainerTypeData(updatedName, id);
      if (err) reject(new Error(err));
      else {
        let ft = null;
        containerTypesData = containerTypesData.map(t =>
          t.id === id ? (ft = { ...t, name: updatedName.trim() }) : t
        );
        if (ft) resolve(ft);
        else reject(new Error('Không tìm thấy loại container'));
      }
    }, 50)
  );
export const deleteContainerType = id =>
  new Promise(res =>
    setTimeout(() => {
      containerTypesData = containerTypesData.filter(t => t.id !== id);
      res({ id });
    }, 50)
  );

// --- START: Vehicles (Phương tiện) Mock Data & Functions ---
let vehiclesData = [
  { id: 'v1', licensePlate: '51C-12345' },
  { id: 'v2', licensePlate: '29H-54321' },
  { id: 'v3', licensePlate: '60A-98765' },
  { id: 'v4', licensePlate: '51F-11223' },
];
export const getVehicles = () => new Promise(res => setTimeout(() => res([...vehiclesData]), 50));
export const getVehiclesForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(vehiclesData.map(v => ({ id: v.id, name: v.licensePlate }))), 50)
  );
const validateVehicleData = (licensePlate, id = null) => {
  if (!licensePlate || licensePlate.trim() === '') return 'Biển số xe không được để trống.';
  if (vehiclesData.some(v => v.licensePlate === licensePlate.trim() && v.id !== id))
    return 'Biển số xe đã tồn tại.';
  return null;
};
export const addVehicle = licensePlate =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateVehicleData(licensePlate);
      if (err) reject(new Error(err));
      else {
        const newV = { id: String(Date.now()), licensePlate: licensePlate.trim() };
        vehiclesData.push(newV);
        resolve(newV);
      }
    }, 50)
  );
export const updateVehicle = (id, updatedLicensePlate) =>
  new Promise((resolve, reject) =>
    setTimeout(() => {
      const err = validateVehicleData(updatedLicensePlate, id);
      if (err) reject(new Error(err));
      else {
        let fv = null;
        vehiclesData = vehiclesData.map(v =>
          v.id === id ? (fv = { ...v, licensePlate: updatedLicensePlate.trim() }) : v
        );
        if (fv) resolve(fv);
        else reject(new Error('Không tìm thấy xe'));
      }
    }, 50)
  );
export const deleteVehicle = id =>
  new Promise(res =>
    setTimeout(() => {
      vehiclesData = vehiclesData.filter(v => v.id !== id);
      res({ id });
    }, 50)
  );

// --- START: Employees (Nhân viên) Mock Data & Functions ---
export const employeeRoles = ['Quản lý', 'Kế toán', 'Giao nhận', 'Lái xe'];
let employeesData = [
  {
    id: 'emp1',
    tenNhanVien: 'Nguyễn Văn An',
    tenDangNhap: 'an.nv',
    matKhau: 'password123',
    email: 'an.nv@example.com',
    chucVu: 'Quản lý',
  },
  {
    id: 'emp2',
    tenNhanVien: 'Trần Thị Bình',
    tenDangNhap: 'binh.tt',
    matKhau: 'password123',
    email: 'binh.tt@example.com',
    chucVu: 'Kế toán',
  },
  {
    id: 'emp3',
    tenNhanVien: 'Lê Văn Cường',
    tenDangNhap: 'cuong.lv',
    matKhau: 'password123',
    email: 'cuong.lv@example.com',
    chucVu: 'Giao nhận',
  },
  {
    id: 'emp4',
    tenNhanVien: 'Phạm Thị Dung',
    tenDangNhap: 'dung.pt',
    matKhau: 'password123',
    email: 'dung.pt@example.com',
    chucVu: 'Lái xe',
  },
  {
    id: 'emp5',
    tenNhanVien: 'Hoàng Văn Em',
    tenDangNhap: 'em.hv',
    matKhau: 'password123',
    email: 'em.hv@example.com',
    chucVu: 'Lái xe',
  },
];
export const getEmployees = () => new Promise(res => setTimeout(() => res([...employeesData]), 50));
const validateEmployeeData = (employeeData, isUpdate = false, id = null) => {
  /* ... */ return null;
}; // Assume exists
export const addEmployee = employeeData => {
  /* ... */
};
export const updateEmployee = (id, updatedEmployeeData) => {
  /* ... */
};
export const deleteEmployee = id => {
  /* ... */
};

// --- START: Customers (Khách hàng) Mock Data & Functions ---
let customersData = [
  {
    id: 'cust1',
    tenKhachHang: 'Công ty TNHH ABC Vận Tải',
    diaChi: '123 Đường X, Quận Y, TP.HCM',
    soDienThoai: '0901234567',
  },
  {
    id: 'cust2',
    tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics',
    diaChi: '456 Đại lộ Z, Khu A, TP. Biên Hòa',
    soDienThoai: '0918765432',
  },
  {
    id: 'cust3',
    tenKhachHang: 'Công ty Cổ Phần DEF Giao Nhận',
    diaChi: '789 Phố B, Quận C, TP. Hà Nội',
    soDienThoai: '0987123789',
  },
  {
    id: 'cust4',
    tenKhachHang: 'Tập đoàn GHI Xuất Nhập Khẩu',
    diaChi: 'Lô 1, KCN Sóng Thần, Bình Dương',
    soDienThoai: '0934567123',
  },
  {
    id: 'cust5',
    tenKhachHang: 'Công ty Liên Doanh JKL Express',
    diaChi: 'Số 10, Đường K, TP. Đà Nẵng',
    soDienThoai: '0977890456',
  },
];
export const getCustomers = () => new Promise(res => setTimeout(() => res([...customersData]), 50));
export const getCustomersForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(customersData.map(c => ({ id: c.id, name: c.tenKhachHang }))), 50)
  );
const validateCustomerData = (customerData, isUpdate = false, id = null) => {
  /* ... */ return null;
}; // Assume exists
export const addCustomer = customerData => {
  /* ... */
};
export const updateCustomer = (id, updatedCustomerData) => {
  /* ... */
};
export const deleteCustomer = id => {
  /* ... */
};

// --- START: Partners (Đối tác) Mock Data & Functions ---
let partnersData = [
  {
    id: 'p1',
    tenDoiTac: 'Đối tác Vận Tải An Phát',
    diaChi: 'Số 1 Đường P, Quận Q, TP.HCM',
    soDienThoai: '0909111222',
  },
  {
    id: 'p2',
    tenDoiTac: 'Công ty Logistics Toàn Cầu',
    diaChi: 'Số 2 Đường R, Quận S, TP. Hà Nội',
    soDienThoai: '0909333444',
  },
  {
    id: 'p3',
    tenDoiTac: 'Dịch vụ Kho Vận Miền Nam',
    diaChi: 'Số 3 Đường T, KCN Biên Hòa, Đồng Nai',
    soDienThoai: '0909555666',
  },
];
export const getPartners = () => new Promise(res => setTimeout(() => res([...partnersData]), 50));
export const getPartnersForSelect = () =>
  new Promise(res =>
    setTimeout(() => res(partnersData.map(p => ({ id: p.id, name: p.tenDoiTac }))), 50)
  );
const validatePartnerData = (partnerData, isUpdate = false, id = null) => {
  /* ... */ return null;
}; // Assume exists
export const addPartner = partnerData => {
  /* ... */
};
export const updatePartner = (id, updatedPartnerData) => {
  /* ... */
};
export const deletePartner = id => {
  /* ... */
};

// --- START: Cost Rates (Định Mức Đi Đường) Mock Data & Functions ---
let costRatesData = [
  { id: 'cr1', description: 'Nội thành TP.HCM', kmMin: 0, kmMax: 50, rate: 15000 },
  { id: 'cr2', description: 'Liên tỉnh gần', kmMin: 51, kmMax: 100, rate: 12000 },
];
export const getCostRates = () => new Promise(res => setTimeout(() => res([...costRatesData]), 50));
const validateCostRateData = (rateData, isUpdate = false, id = null) => {
  /* ... */ return null;
}; // Assume exists
export const addCostRate = rateData => {
  /* ... */
};
export const updateCostRate = (id, updatedRateData) => {
  /* ... */
};
export const deleteCostRate = id => {
  /* ... */
};

// --- START: Shipment Plans (Lịch Vận Chuyển) Mock Data & Functions ---
const recalculateShipmentCosts = (plan) => {
  plan.dauDong = (plan.dauLit || 0) * (plan.donGiaDau || 0);
  plan.costFuel = plan.dauDong;
  let detailedOtherCostsSum = 0;
  if (plan.detailedOtherCosts && Array.isArray(plan.detailedOtherCosts)) {
    detailedOtherCostsSum = plan.detailedOtherCosts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }
  plan.chiPhiKhac = detailedOtherCostsSum;
  plan.tongChiPhiPhuongTien = (plan.dauDong || 0) + (plan.phiDiDuong || 0) + (plan.cuocThueVanChuyen || 0);
  plan.totalCost = (plan.costFuel || 0) +
                   (plan.costTolls || 0) +
                   (plan.costMaintenance || 0) +
                   plan.chiPhiKhac +
                   (plan.cuocThueVanChuyen || 0);
  plan.loiNhuanPhuongTien = (plan.cuocVanChuyen || 0) - plan.tongChiPhiPhuongTien;
  return plan;
};

let shipmentPlansData = [
  recalculateShipmentCosts({
    id: 'sp1', ngayThang: '01/01/2024', bienSoXeId: 'v1', bienSoXe: '51C-12345', doiTacId: 'p1', tenDoiTac: 'Đối tác Vận Tải An Phát',
    dienGiai: 'Chở hàng Tết đợt 1', tuyenDuong: { diemDi: 'Kho A', diemDen: ['Kho B', 'Kho C'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct1', tenLoaiContainer: "20'DC",
    cuocVanChuyen: 5000000, thongTinContainer: [{ soContainer: 'CONT111', soSeal: 'SEAL111' }],
    ngayHaHang: '02/01/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    dauLit: 100, donGiaDau: 20000, phiDiDuong: 500000,
    costTolls: 500000, costMaintenance: 200000,
    detailedOtherCosts: [ { id: 'doc1_1', name: "Bốc xếp", amount: 300000 }, { id: 'doc1_2', name: "Lưu kho", amount: 100000 } ],
    kmChuyenHang: 120, kmChuyenVoRong: 30, dinhMucDiDuong: 500000,
  }),
  recalculateShipmentCosts({
    id: 'sp2', ngayThang: '15/01/2024', bienSoXeId: 'v2', bienSoXe: '29H-54321', doiTacId: '', tenDoiTac: '-',
    dienGiai: 'Giao hàng cho siêu thị XYZ', tuyenDuong: { diemDi: 'Cảng X', diemDen: ['Siêu thị Y'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust2', tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics', loaiContainerId: 'ct2', tenLoaiContainer: "40'DC",
    cuocVanChuyen: 7500000, thongTinContainer: [{ soContainer: 'CONT222', soSeal: 'SEAL222' }],
    ngayHaHang: '15/01/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    dauLit: 150, donGiaDau: 20000, phiDiDuong: 700000,
    costTolls: 700000, costMaintenance: 300000,
    detailedOtherCosts: [ { id: 'doc2_1', name: "Phí cảng", amount: 400000 } ],
    kmChuyenHang: 150, kmChuyenVoRong: 40, dinhMucDiDuong: 700000,
  }),
  recalculateShipmentCosts({
    id: 'sp3', ngayThang: '05/02/2024', bienSoXeId: 'v1', bienSoXe: '51C-12345', doiTacId: '', tenDoiTac: '-',
    dienGiai: 'Vận chuyển hàng đông lạnh', tuyenDuong: { diemDi: 'Kho Lạnh A', diemDen: ['Kho Lạnh B'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct4', tenLoaiContainer: "20'RF",
    cuocVanChuyen: 6000000, thongTinContainer: [{ soContainer: 'CONT333', soSeal: 'SEAL333' }],
    ngayHaHang: '05/02/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    dauLit: 120, donGiaDau: 21000, phiDiDuong: 600000,
    costTolls: 600000, costMaintenance: 400000, detailedOtherCosts: [],
    kmChuyenHang: 100, kmChuyenVoRong: 20, dinhMucDiDuong: 600000,
  }),
  // ... other plans
];
export const getShipmentPlans = () =>
  new Promise(res => setTimeout(() => res([...shipmentPlansData]), 50));
export const addShipmentPlan = async (planData) => {
  // ... existing code ...
};
export const updateShipmentPlan = (id, updatedPlanData) => {
  // ... existing code ...
};
export const deleteShipmentPlan = id => {
  // ... existing code ...
};

export const updateShipmentPlanField = async (planId, field, value) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  let updatedPlan = null;
  shipmentPlansData = shipmentPlansData.map(plan => {
    if (plan.id === planId) {
      const newPlan = { ...plan, [field]: value };
      updatedPlan = recalculateShipmentCosts(newPlan);
      return updatedPlan;
    }
    return plan;
  });
  if (updatedPlan) {
    return { ...updatedPlan };
  }
  throw new Error("Plan not found");
};

// --- START: CRUD for Detailed Other Costs ---
export const addDetailedOtherCostItem = async (planId, itemName, itemAmount) => {
  // ... existing code ...
};
export const updateDetailedOtherCostItem = async (planId, itemId, updatedName, updatedAmount) => {
  // ... existing code ...
};
export const deleteDetailedOtherCostItem = async (planId, itemId) => {
  // ... existing code ...
};
// --- END: CRUD for Detailed Other Costs ---

// --- END: Shipment Plans (Lịch Vận Chuyển) Mock Data & Functions ---

// --- START: Financial Report (Báo Cáo Tài Chính) Mock Data ---
export const financialReportData = [
  {
    id: 'fr1',
    month: '01/2024',
    vehicle: '51C-12345',
    revenue: 25000000,
    costs: {
      fuel: 8000000,
      maintenance: 2000000,
      tolls: 1500000,
      other: 1000000
    },
    profit: 11500000
  },
  {
    id: 'fr2',
    month: '01/2024',
    vehicle: '29H-67890',
    revenue: 35000000,
    costs: {
      fuel: 12000000,
      maintenance: 3000000,
      tolls: 2000000,
      other: 1500000
    },
    profit: 16500000
  },
  {
    id: 'fr3',
    month: '02/2024',
    vehicle: '51C-12345',
    revenue: 28000000,
    costs: {
      fuel: 9000000,
      maintenance: 2500000,
      tolls: 1800000,
      other: 1200000
    },
    profit: 13500000
  },
  {
    id: 'fr4',
    month: '02/2024',
    vehicle: '29H-67890',
    revenue: 32000000,
    costs: {
      fuel: 11000000,
      maintenance: 2800000,
      tolls: 1900000,
      other: 1300000
    },
    profit: 15000000
  },
  {
    id: 'fr5',
    month: '03/2024',
    vehicle: '51C-12345',
    revenue: 30000000,
    costs: {
      fuel: 9500000,
      maintenance: 2700000,
      tolls: 1850000,
      other: 1250000
    },
    profit: 14700000
  },
  {
    id: 'fr6',
    month: '03/2024',
    vehicle: '29H-67890',
    revenue: 38000000,
    costs: {
      fuel: 13000000,
      maintenance: 3200000,
      tolls: 2200000,
      other: 1600000
    },
    profit: 18000000
  },
  {
    id: 'fr7',
    month: '04/2024',
    vehicle: '51C-12345',
    revenue: 27000000,
    costs: {
      fuel: 8800000,
      maintenance: 2300000,
      tolls: 1700000,
      other: 1100000
    },
    profit: 13100000
  },
  {
    id: 'fr8',
    month: '04/2024',
    vehicle: '29H-67890',
    revenue: 33000000,
    costs: {
      fuel: 11500000,
      maintenance: 2900000,
      tolls: 1950000,
      other: 1400000
    },
    profit: 15200000
  },
  {
    id: 'fr9',
    month: '05/2024',
    vehicle: '51C-12345',
    revenue: 29000000,
    costs: {
      fuel: 9200000,
      maintenance: 2600000,
      tolls: 1750000,
      other: 1150000
    },
    profit: 14300000
  },
  {
    id: 'fr10',
    month: '05/2024',
    vehicle: '29H-67890',
    revenue: 36000000,
    costs: {
      fuel: 12500000,
      maintenance: 3100000,
      tolls: 2100000,
      other: 1500000
    },
    profit: 16800000
  }
];

// --- START: Profit & Revenue Report Mock Data ---
export const profitAndRevenueData = [
  {
    id: 'pr1',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    revenue: 25000000,
    costs: 12500000,
    profit: 12500000
  },
  {
    id: 'pr2',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    revenue: 35000000,
    costs: 18500000,
    profit: 16500000
  },
  {
    id: 'pr3',
    monthYear: '2024-02',
    bienSoXe: '51C-12345',
    revenue: 28000000,
    costs: 14500000,
    profit: 13500000
  },
  {
    id: 'pr4',
    monthYear: '2024-02',
    bienSoXe: '29H-67890',
    revenue: 32000000,
    costs: 17000000,
    profit: 15000000
  },
  {
    id: 'pr5',
    monthYear: '2024-03',
    bienSoXe: '51C-12345',
    revenue: 30000000,
    costs: 15300000,
    profit: 14700000
  },
  {
    id: 'pr6',
    monthYear: '2024-03',
    bienSoXe: '29H-67890',
    revenue: 38000000,
    costs: 20000000,
    profit: 18000000
  },
  {
    id: 'pr7',
    monthYear: '2024-04',
    bienSoXe: '51C-12345',
    revenue: 27000000,
    costs: 13900000,
    profit: 13100000
  },
  {
    id: 'pr8',
    monthYear: '2024-04',
    bienSoXe: '29H-67890',
    revenue: 33000000,
    costs: 17800000,
    profit: 15200000
  },
  {
    id: 'pr9',
    monthYear: '2024-05',
    bienSoXe: '51C-12345',
    revenue: 29000000,
    costs: 14700000,
    profit: 14300000
  },
  {
    id: 'pr10',
    monthYear: '2024-05',
    bienSoXe: '29H-67890',
    revenue: 36000000,
    costs: 19200000,
    profit: 16800000
  }
];

// --- START: Cost Report Mock Data ---
export const costReportData = [
  {
    id: 'cr1',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Nhiên liệu',
    amount: 8000000
  },
  {
    id: 'cr2',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Bảo trì',
    amount: 2000000
  },
  {
    id: 'cr3',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Phí đường bộ',
    amount: 1500000
  },
  {
    id: 'cr4',
    monthYear: '2024-01',
    bienSoXe: '51C-12345',
    category: 'Chi phí khác',
    amount: 1000000
  },
  {
    id: 'cr5',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Nhiên liệu',
    amount: 12000000
  },
  {
    id: 'cr6',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Bảo trì',
    amount: 3000000
  },
  {
    id: 'cr7',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Phí đường bộ',
    amount: 2000000
  },
  {
    id: 'cr8',
    monthYear: '2024-01',
    bienSoXe: '29H-67890',
    category: 'Chi phí khác',
    amount: 1500000
  },
  {
    id: 'cr9',
    monthYear: '2024-02',
    bienSoXe: '51C-12345',
    category: 'Nhiên liệu',
    amount: 9000000
  },
  {
    id: 'cr10',
    monthYear: '2024-02',
    bienSoXe: '51C-12345',
    category: 'Bảo trì',
    amount: 2500000
  }
];

// --- START: Revenue Tracking Report Mock Data ---
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
    profit: 3750000
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
    profit: 2300000
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
    profit: 6200000
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
    profit: 2100000
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
    profit: 3000000
  },
  {
    id: 'rt6',
    date: '2024-01-25',
    description: 'Vận chuyển hàng từ HCM đến Nha Trang',
    containerCount: 1,
    route: 'HCM - NT',
    fuelLiters: 100,
    fuelPrice: 25000,
    roadCost: 300000,
    totalCost: 2800000,
    transportFee: 6000000,
    profit: 3200000
  },
  {
    id: 'rt7',
    date: '2024-02-01',
    description: 'Vận chuyển hàng từ HN đến Hải Phòng',
    containerCount: 2,
    route: 'HN - HP',
    fuelLiters: 85,
    fuelPrice: 25000,
    roadCost: 220000,
    totalCost: 2325000,
    transportFee: 5000000,
    profit: 2675000
  },
  {
    id: 'rt8',
    date: '2024-02-05',
    description: 'Vận chuyển hàng từ HCM đến Đà Nẵng',
    containerCount: 3,
    route: 'HCM - DN',
    fuelLiters: 190,
    fuelPrice: 25000,
    roadCost: 750000,
    totalCost: 5500000,
    transportFee: 11500000,
    profit: 6000000
  },
  {
    id: 'rt9',
    date: '2024-02-10',
    description: 'Vận chuyển hàng từ Cần Thơ đến HCM',
    containerCount: 1,
    route: 'CT - HCM',
    fuelLiters: 75,
    fuelPrice: 25000,
    roadCost: 160000,
    totalCost: 2035000,
    transportFee: 4200000,
    profit: 2165000
  },
  {
    id: 'rt10',
    date: '2024-02-15',
    description: 'Vận chuyển hàng từ HCM đến HN',
    containerCount: 2,
    route: 'HCM - HN',
    fuelLiters: 155,
    fuelPrice: 25000,
    roadCost: 520000,
    totalCost: 4395000,
    transportFee: 8500000,
    profit: 4105000
  }
];

// --- START: Debt Report Mock Data ---
export const debtReportData = [
  {
    id: 'debt1',
    entityName: 'Công ty TNHH ABC Vận Tải',
    entityType: 'customer',
    monthYear: '2024-01',
    phaiThu: 15000000,
    phaiTra: 0,
    ghiChu: 'Thanh toán đúng hạn'
  },
  {
    id: 'debt2',
    entityName: 'Đối tác Vận Tải An Phát',
    entityType: 'partner',
    monthYear: '2024-01',
    phaiThu: 0,
    phaiTra: 5000000,
    ghiChu: 'Đã thanh toán 1 phần'
  },
  {
    id: 'debt3',
    entityName: 'Doanh nghiệp tư nhân XYZ Logistics',
    entityType: 'customer',
    monthYear: '2024-01',
    phaiThu: 8000000,
    phaiTra: 0,
    ghiChu: 'Chậm thanh toán'
  },
  {
    id: 'debt4',
    entityName: 'Công ty Logistics Toàn Cầu',
    entityType: 'partner',
    monthYear: '2024-02',
    phaiThu: 2000000,
    phaiTra: 12000000,
    ghiChu: ''
  },
  {
    id: 'debt5',
    entityName: 'Công ty TNHH ABC Vận Tải',
    entityType: 'customer',
    monthYear: '2024-02',
    phaiThu: 10000000,
    phaiTra: 0,
    ghiChu: 'Hợp đồng mới'
  },
  {
    id: 'debt6',
    entityName: 'Dịch vụ Kho Vận Miền Nam',
    entityType: 'partner',
    monthYear: '2024-02',
    phaiThu: 0,
    phaiTra: 3500000,
    ghiChu: 'Ưu đãi thanh toán sớm'
  },
  {
    id: 'debt7',
    entityName: 'Công ty Cổ Phần DEF Giao Nhận',
    entityType: 'customer',
    monthYear: '2024-03',
    phaiThu: 22000000,
    phaiTra: 0,
    ghiChu: 'Chưa thanh toán'
  },
  {
    id: 'debt8',
    entityName: 'Công ty TNHH Giao Nhận Quốc Tế',
    entityType: 'partner',
    monthYear: '2024-03',
    phaiThu: 0,
    phaiTra: 8000000,
    ghiChu: 'Thanh toán định kỳ'
  },
  {
    id: 'debt9',
    entityName: 'Công ty TNHH Vận Tải Biển Đông',
    entityType: 'customer',
    monthYear: '2024-03',
    phaiThu: 15000000,
    phaiTra: 0,
    ghiChu: 'Đang xử lý'
  },
  {
    id: 'debt10',
    entityName: 'Công ty Logistics Đông Nam Á',
    entityType: 'partner',
    monthYear: '2024-03',
    phaiThu: 0,
    phaiTra: 6000000,
    ghiChu: 'Thanh toán theo hợp đồng'
  }
];

// Update the mockData object to include the new data
Object.assign(mockData, {
  financialReport: financialReportData,
  profitAndRevenue: profitAndRevenueData,
  costReport: costReportData,
  revenueTracking: revenueTrackingData,
  debtReport: debtReportData
});

// --- END: Financial Report (Báo Cáo Tài Chính) Mock Data ---

// --- START: Detailed Cost Report Functions ---
export const getDetailedCostReport = () => {
  /* ... */
};
// --- END: Detailed Cost Report Functions ---

// --- START: Other Vehicle Costs Data & Functions ---
let otherVehicleCostsData = [
  {
    id: 'ovc1',
    vehicleId: 'v1',
    monthYear: '2024-01',
    description: 'Phí gửi xe tháng 1',
    amount: 500000,
  },
  {
    id: 'ovc2',
    vehicleId: 'v1',
    monthYear: '2024-01',
    description: 'Bảo hiểm xe quý 1',
    amount: 1500000,
  },
  {
    id: 'ovc3',
    vehicleId: 'v2',
    monthYear: '2024-01',
    description: 'Sửa chữa lặt vặt',
    amount: 300000,
  },
  {
    id: 'ovc4',
    vehicleId: 'v1',
    monthYear: '2024-02',
    description: 'Phí gửi xe tháng 2',
    amount: 500000,
  },
  { id: 'ovc5', vehicleId: 'v3', monthYear: '2024-02', description: 'Thay lốp', amount: 4000000 },
  { id: 'ovc6', vehicleId: 'v2', monthYear: '2024-03', description: 'Đăng kiểm', amount: 1000000 },
];
// --- END: Other Vehicle Costs Data & Functions ---

// --- START: Vehicle Monthly Details Report Functions ---
export const getAvailableMonthsForReport = () => {
  // Can be used for multiple reports if date source is consistent
  return new Promise(resolve => {
    const uniqueMonths = new Set();
    shipmentPlansData.forEach(plan => {
      const [day, month, year] = plan.ngayThang.split('/');
      uniqueMonths.add(`${year}-${month}`);
    });
    otherVehicleCostsData.forEach(cost => {
      // Also consider months from other costs
      uniqueMonths.add(cost.monthYear);
    });
    const sortedMonths = Array.from(uniqueMonths)
      .sort((a, b) => b.localeCompare(a)) // Sorts YYYY-MM descending (most recent first)
      .map(monthYear => {
        const [year, month] = monthYear.split('-');
        return { label: `${month}/${year}`, value: monthYear };
      });
    setTimeout(() => resolve(sortedMonths), 50);
  });
};

export const getVehicleMonthlyDetailsReport = (vehicleId, monthYear) => {
  return new Promise(resolve => {
    const relevantPlans = shipmentPlansData.filter(
      plan =>
        plan.bienSoXeId === vehicleId &&
        plan.ngayThang.endsWith(`/${monthYear.substring(5)}/${monthYear.substring(0, 4)}`) && // Match MM/YYYY part
        plan.trangThai === 'Hoàn thành'
    );

    const relevantOtherCosts = otherVehicleCostsData.filter(
      cost => cost.vehicleId === vehicleId && cost.monthYear === monthYear
    );

    let totalRevenue = 0;
    let totalShipmentCosts = 0; // Sum of tongChiPhiPhuongTien for each plan

    const shipmentDetails = relevantPlans.map(plan => {
      totalRevenue += plan.cuocVanChuyen || 0;
      totalShipmentCosts += plan.tongChiPhiPhuongTien || 0;
      return {
        id: plan.id,
        ngayThang: plan.ngayThang,
        dienGiai: plan.dienGiai,
        soContainer: plan.thongTinContainer?.map(c => c.soContainer).join(', ') || '-',
        tuyenDuong: plan.tuyenDuong,
        dauLit: plan.dauLit || 0,
        dauDong: plan.dauDong || 0,
        phiDiDuong: plan.phiDiDuong || 0,
        tongChiPhiPhuongTien: plan.tongChiPhiPhuongTien || 0, // Cost specific to this shipment
        cuocVanChuyen: plan.cuocVanChuyen || 0,
        loiNhuanPhuongTien: plan.loiNhuanPhuongTien || 0, // Profit specific to this shipment
      };
    });

    const totalOtherCostsAmount = relevantOtherCosts.reduce((sum, cost) => sum + cost.amount, 0);
    const grandTotalCosts = totalShipmentCosts + totalOtherCostsAmount;
    const grandTotalProfit = totalRevenue - grandTotalCosts;

    setTimeout(
      () =>
        resolve({
          overview: {
            totalRevenue,
            totalShipmentCosts, // Costs directly from shipments
            totalOtherCosts: totalOtherCostsAmount, // Other general costs for the vehicle in that month
            grandTotalCosts, // All costs combined
            grandTotalProfit,
          },
          shipmentDetails,
          otherCosts: relevantOtherCosts.map(c => ({
            id: c.id,
            description: c.description,
            amount: c.amount,
          })),
        }),
      200
    );
  });
};
// --- END: Vehicle Monthly Details Report Functions ---

// --- START: Debt Report Data & Functions ---
export const getDebtReport = monthYear => {
  return new Promise(resolve => {
    const filteredData = debtReportData.filter(item => item.monthYear === monthYear);
    setTimeout(() => resolve(filteredData), 200);
  });
};

export const getAvailableMonthsForDebtReport = () => {
  return new Promise(resolve => {
    const uniqueMonths = new Set();
    debtReportData.forEach(item => {
      uniqueMonths.add(item.monthYear);
    });
    const sortedMonths = Array.from(uniqueMonths)
      .sort((a, b) => b.localeCompare(a)) // Sorts YYYY-MM descending
      .map(monthYear => {
        const [year, month] = monthYear.split('-');
        return { label: `${month}/${year}`, value: monthYear };
      });
    setTimeout(() => resolve(sortedMonths), 50);
  });
};
// --- END: Debt Report Data & Functions ---

// Keep other existing mock data exports
export const mockEmployees = mockEmployeesOld;
