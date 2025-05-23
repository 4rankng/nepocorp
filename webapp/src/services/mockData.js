// Mock user data
export const users = {
  quanly: {
    username: 'quanly',
    password: 'password123',
    role: 'quanly',
    fullName: 'Quản Lý Hệ Thống'
  },
  ketoan: {
    username: 'ketoan',
    password: 'password123',
    role: 'ketoan',
    fullName: 'Kế Toán Viên'
  },
  giaonhan: {
    username: 'giaonhan',
    password: 'password123',
    role: 'giaonhan',
    fullName: 'Nhân Viên Giao Nhận'
  },
  laixe: {
    username: 'laixe',
    password: 'password123',
    role: 'laixe',
    fullName: 'Tài Xế'
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
  financialReport: [] // Old, will be replaced by new function
};

// Helper function to get user by username
export const getUserByUsername = (username) => {
  return users[username.toLowerCase()];
};

// Helper function to verify user credentials
export const verifyCredentials = (username, password) => {
  const user = users[username.toLowerCase()];
  return user && user.password === password ? user : null;
};

// Mock data for authentication
export const mockUsers = [ /* ... */ ];

// Mock data for vehicles (existing, might be for other purposes)
export const mockVehicles = [ /* ... */ ];

// Mock data for containers (old, potentially different structure)
export const mockContainers = [ /* ... */ ];

// Mock data for employees (existing, different structure)
export const mockEmployeesOld = [ /* ... */ ];

// Mock data for schedules, costs...
export const mockSchedules = [ /* ... */ ];
export const mockCosts = [ /* ... */ ];


// --- START: Container Types Mock Data & Functions ---
let containerTypesData = [
  { id: 'ct1', name: '20’DC' },
  { id: 'ct2', name: '40’DC' },
  { id: 'ct3', name: '40’HC' },
  { id: 'ct4', name: '20’RF' },
  { id: 'ct5', name: '45’HC' },
];
export const getContainerTypes = () => new Promise(res => setTimeout(() => res([...containerTypesData]), 50));
export const getContainerTypesForSelect = () => new Promise(res => setTimeout(() => res(containerTypesData.map(ct => ({id: ct.id, name: ct.name}))), 50));
const validateContainerTypeData = (name, id = null) => {
  if (!name || name.trim() === '') return 'Tên loại container không được để trống.';
  if (containerTypesData.some(c => c.name === name.trim() && c.id !== id)) return 'Tên loại container đã tồn tại.';
  return null;
};
export const addContainerType = (typeName) => new Promise((resolve, reject) => setTimeout(() => { const err = validateContainerTypeData(typeName); if(err) reject(new Error(err)); else { const newType = { id: String(Date.now()), name: typeName.trim() }; containerTypesData.push(newType); resolve(newType);}}, 50));
export const updateContainerType = (id, updatedName) => new Promise((resolve, reject) => setTimeout(() => { const err = validateContainerTypeData(updatedName, id); if(err) reject(new Error(err)); else { let ft=null; containerTypesData = containerTypesData.map(t => t.id === id ? (ft={ ...t, name: updatedName.trim() }) : t); if(ft) resolve(ft); else reject(new Error('Không tìm thấy loại container'));}}, 50));
export const deleteContainerType = (id) => new Promise(res => setTimeout(() => { containerTypesData = containerTypesData.filter(t => t.id !== id); res({id});}, 50));


// --- START: Vehicles (Phương tiện) Mock Data & Functions ---
let vehiclesData = [
  { id: 'v1', licensePlate: '51C-12345' },
  { id: 'v2', licensePlate: '29H-54321' },
  { id: 'v3', licensePlate: '60A-98765' },
  { id: 'v4', licensePlate: '51F-11223' },
];
export const getVehicles = () => new Promise(res => setTimeout(() => res([...vehiclesData]), 50));
export const getVehiclesForSelect = () => new Promise(res => setTimeout(() => res(vehiclesData.map(v => ({id: v.id, name: v.licensePlate}))), 50));
const validateVehicleData = (licensePlate, id = null) => {
    if (!licensePlate || licensePlate.trim() === '') return 'Biển số xe không được để trống.';
    if (vehiclesData.some(v => v.licensePlate === licensePlate.trim() && v.id !== id)) return 'Biển số xe đã tồn tại.';
    return null;
};
export const addVehicle = (licensePlate) => new Promise((resolve, reject) => setTimeout(() => { const err = validateVehicleData(licensePlate); if(err) reject(new Error(err)); else { const newV = { id: String(Date.now()), licensePlate: licensePlate.trim() }; vehiclesData.push(newV); resolve(newV);}}, 50));
export const updateVehicle = (id, updatedLicensePlate) => new Promise((resolve, reject) => setTimeout(() => { const err = validateVehicleData(updatedLicensePlate, id); if(err) reject(new Error(err)); else { let fv=null; vehiclesData = vehiclesData.map(v => v.id === id ? (fv={ ...v, licensePlate: updatedLicensePlate.trim() }) : v); if(fv) resolve(fv); else reject(new Error('Không tìm thấy xe'));}}, 50));
export const deleteVehicle = (id) => new Promise(res => setTimeout(() => { vehiclesData = vehiclesData.filter(v => v.id !== id); res({id});}, 50));


// --- START: Employees (Nhân viên) Mock Data & Functions ---
export const employeeRoles = ['Quản lý', 'Kế toán', 'Giao nhận', 'Lái xe'];
let employeesData = [
  { id: 'emp1', tenNhanVien: 'Nguyễn Văn An', tenDangNhap: 'an.nv', matKhau: 'password123', email: 'an.nv@example.com', chucVu: 'Quản lý' },
  { id: 'emp2', tenNhanVien: 'Trần Thị Bình', tenDangNhap: 'binh.tt', matKhau: 'password123', email: 'binh.tt@example.com', chucVu: 'Kế toán' },
  { id: 'emp3', tenNhanVien: 'Lê Văn Cường', tenDangNhap: 'cuong.lv', matKhau: 'password123', email: 'cuong.lv@example.com', chucVu: 'Giao nhận' },
  { id: 'emp4', tenNhanVien: 'Phạm Thị Dung', tenDangNhap: 'dung.pt', matKhau: 'password123', email: 'dung.pt@example.com', chucVu: 'Lái xe' },
  { id: 'emp5', tenNhanVien: 'Hoàng Văn Em', tenDangNhap: 'em.hv', matKhau: 'password123', email: 'em.hv@example.com', chucVu: 'Lái xe' },
];
export const getEmployees = () => new Promise(res => setTimeout(() => res([...employeesData]), 50));
const validateEmployeeData = (employeeData, isUpdate = false, id = null) => { /* ... */ return null; }; // Assume exists
export const addEmployee = (employeeData) => { /* ... */ };
export const updateEmployee = (id, updatedEmployeeData) => { /* ... */ };
export const deleteEmployee = (id) => { /* ... */ };


// --- START: Customers (Khách hàng) Mock Data & Functions ---
let customersData = [
  { id: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', diaChi: '123 Đường X, Quận Y, TP.HCM', soDienThoai: '0901234567' },
  { id: 'cust2', tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics', diaChi: '456 Đại lộ Z, Khu A, TP. Biên Hòa', soDienThoai: '0918765432' },
  { id: 'cust3', tenKhachHang: 'Công ty Cổ Phần DEF Giao Nhận', diaChi: '789 Phố B, Quận C, TP. Hà Nội', soDienThoai: '0987123789' },
  { id: 'cust4', tenKhachHang: 'Tập đoàn GHI Xuất Nhập Khẩu', diaChi: 'Lô 1, KCN Sóng Thần, Bình Dương', soDienThoai: '0934567123' },
  { id: 'cust5', tenKhachHang: 'Công ty Liên Doanh JKL Express', diaChi: 'Số 10, Đường K, TP. Đà Nẵng', soDienThoai: '0977890456' },
];
export const getCustomers = () => new Promise(res => setTimeout(() => res([...customersData]), 50));
export const getCustomersForSelect = () => new Promise(res => setTimeout(() => res(customersData.map(c => ({id: c.id, name: c.tenKhachHang}))), 50));
const validateCustomerData = (customerData, isUpdate = false, id = null) => { /* ... */ return null; }; // Assume exists
export const addCustomer = (customerData) => { /* ... */ };
export const updateCustomer = (id, updatedCustomerData) => { /* ... */ };
export const deleteCustomer = (id) => { /* ... */ };


// --- START: Partners (Đối tác) Mock Data & Functions ---
let partnersData = [
  { id: 'p1', tenDoiTac: 'Đối tác Vận Tải An Phát', diaChi: 'Số 1 Đường P, Quận Q, TP.HCM', soDienThoai: '0909111222' },
  { id: 'p2', tenDoiTac: 'Công ty Logistics Toàn Cầu', diaChi: 'Số 2 Đường R, Quận S, TP. Hà Nội', soDienThoai: '0909333444' },
  { id: 'p3', tenDoiTac: 'Dịch vụ Kho Vận Miền Nam', diaChi: 'Số 3 Đường T, KCN Biên Hòa, Đồng Nai', soDienThoai: '0909555666' },
];
export const getPartners = () => new Promise(res => setTimeout(() => res([...partnersData]), 50));
export const getPartnersForSelect = () => new Promise(res => setTimeout(() => res(partnersData.map(p => ({id: p.id, name: p.tenDoiTac}))), 50));
const validatePartnerData = (partnerData, isUpdate = false, id = null) => { /* ... */ return null; }; // Assume exists
export const addPartner = (partnerData) => { /* ... */ };
export const updatePartner = (id, updatedPartnerData) => { /* ... */ };
export const deletePartner = (id) => { /* ... */ };


// --- START: Cost Rates (Định Mức Đi Đường) Mock Data & Functions ---
let costRatesData = [
  { id: 'cr1', description: 'Nội thành TP.HCM', kmMin: 0, kmMax: 50, rate: 15000 },
  { id: 'cr2', description: 'Liên tỉnh gần', kmMin: 51, kmMax: 100, rate: 12000 },
];
export const getCostRates = () => new Promise(res => setTimeout(() => res([...costRatesData]), 50));
const validateCostRateData = (rateData, isUpdate = false, id = null) => { /* ... */ return null; }; // Assume exists
export const addCostRate = (rateData) => { /* ... */ };
export const updateCostRate = (id, updatedRateData) => { /* ... */ };
export const deleteCostRate = (id) => { /* ... */ };


// --- START: Shipment Plans (Lịch Vận Chuyển) Mock Data & Functions ---
const recalculateShipmentCosts = (plan) => {
  plan.dauDong = (plan.dauLit || 0) * (plan.donGiaDau || 0);
  plan.costFuel = plan.dauDong; 
  
  let detailedOtherCostsSum = 0;
  if (plan.detailedOtherCosts && Array.isArray(plan.detailedOtherCosts)) {
    detailedOtherCostsSum = plan.detailedOtherCosts.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  }
  plan.chiPhiKhac = detailedOtherCostsSum; // This is now the sum of detailedOtherCosts

  plan.tongChiPhiPhuongTien = (plan.dauDong || 0) + (plan.phiDiDuong || 0) + (plan.cuocThueVanChuyen || 0);
  
  plan.totalCost = (plan.costFuel || 0) + 
                   (plan.costTolls || 0) + 
                   (plan.costMaintenance || 0) + 
                   plan.chiPhiKhac + // Sum from detailedOtherCosts
                   (plan.cuocThueVanChuyen || 0);

  plan.loiNhuanPhuongTien = (plan.cuocVanChuyen || 0) - plan.tongChiPhiPhuongTien;
  return plan;
};

let shipmentPlansData = [
  recalculateShipmentCosts({ 
    id: 'sp1', ngayThang: '01/01/2024', bienSoXeId: 'v1', bienSoXe: '51C-12345', doiTacId: 'p1', tenDoiTac: 'Đối tác Vận Tải An Phát', 
    dienGiai: 'Chở hàng Tết đợt 1', tuyenDuong: { diemDi: 'Kho A', diemDen: ['Kho B', 'Kho C'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct1', tenLoaiContainer: '20’DC', 
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
    khachHangId: 'cust2', tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics', loaiContainerId: 'ct2', tenLoaiContainer: '40’DC',
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
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct4', tenLoaiContainer: '20’RF',
    cuocVanChuyen: 6000000, thongTinContainer: [{ soContainer: 'CONT333', soSeal: 'SEAL333' }],
    ngayHaHang: '05/02/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    dauLit: 120, donGiaDau: 21000, phiDiDuong: 600000,
    costTolls: 600000, costMaintenance: 400000, detailedOtherCosts: [],
    kmChuyenHang: 100, kmChuyenVoRong: 20, dinhMucDiDuong: 600000,
  }),
  // ... other plans initialized with recalculateShipmentCosts and detailedOtherCosts
];
export const getShipmentPlans = () => new Promise(res => setTimeout(() => res(shipmentPlansData.map(p => ({...p}))), 50)); 
export const addShipmentPlan = (planData) => { /* ... */ }; 
export const updateShipmentPlan = (id, updatedPlanData) => { /* ... */ }; 
export const deleteShipmentPlan = (id) => { /* ... */ }; 

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
  await new Promise(resolve => setTimeout(resolve, 50));
  const planIndex = shipmentPlansData.findIndex(p => p.id === planId);
  if (planIndex === -1) throw new Error("Shipment plan not found");

  if (!itemName || itemName.trim() === '' || typeof itemAmount !== 'number' || itemAmount <= 0) {
    throw new Error("Invalid item name or amount.");
  }
  
  const newItem = { id: `doc-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: itemName.trim(), amount: itemAmount };
  if (!shipmentPlansData[planIndex].detailedOtherCosts) {
    shipmentPlansData[planIndex].detailedOtherCosts = [];
  }
  shipmentPlansData[planIndex].detailedOtherCosts.push(newItem);
  shipmentPlansData[planIndex] = recalculateShipmentCosts({...shipmentPlansData[planIndex]});
  return {...shipmentPlansData[planIndex]}; // Return the updated plan
};

export const updateDetailedOtherCostItem = async (planId, itemId, updatedName, updatedAmount) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  const planIndex = shipmentPlansData.findIndex(p => p.id === planId);
  if (planIndex === -1) throw new Error("Shipment plan not found");

  if (!updatedName || updatedName.trim() === '' || typeof updatedAmount !== 'number' || updatedAmount <= 0) {
    throw new Error("Invalid item name or amount for update.");
  }

  let itemUpdated = false;
  if (shipmentPlansData[planIndex].detailedOtherCosts) {
    shipmentPlansData[planIndex].detailedOtherCosts = shipmentPlansData[planIndex].detailedOtherCosts.map(item => {
      if (item.id === itemId) {
        itemUpdated = true;
        return { ...item, name: updatedName.trim(), amount: updatedAmount };
      }
      return item;
    });
  }
  if (!itemUpdated) throw new Error("Detailed cost item not found for update.");
  
  shipmentPlansData[planIndex] = recalculateShipmentCosts({...shipmentPlansData[planIndex]});
  return {...shipmentPlansData[planIndex]};
};

export const deleteDetailedOtherCostItem = async (planId, itemId) => {
  await new Promise(resolve => setTimeout(resolve, 50));
  const planIndex = shipmentPlansData.findIndex(p => p.id === planId);
  if (planIndex === -1) throw new Error("Shipment plan not found");

  let itemDeleted = false;
  if (shipmentPlansData[planIndex].detailedOtherCosts) {
    const initialLength = shipmentPlansData[planIndex].detailedOtherCosts.length;
    shipmentPlansData[planIndex].detailedOtherCosts = shipmentPlansData[planIndex].detailedOtherCosts.filter(item => item.id !== itemId);
    itemDeleted = shipmentPlansData[planIndex].detailedOtherCosts.length < initialLength;
  }

  if (!itemDeleted) throw new Error("Detailed cost item not found for deletion.");

  shipmentPlansData[planIndex] = recalculateShipmentCosts({...shipmentPlansData[planIndex]});
  return {...shipmentPlansData[planIndex]};
};
// --- END: CRUD for Detailed Other Costs ---

// --- END: Shipment Plans (Lịch Vận Chuyển) Mock Data & Functions ---


// --- START: Financial Report (Báo Cáo Lợi Nhuận & Doanh Thu) Functions ---
export const getMonthlyProfitAndRevenueReport = () => { /* ... */ };
// --- END: Financial Report Functions ---

// --- START: Detailed Cost Report Functions ---
export const getDetailedCostReport = () => { /* ... */ };
// --- END: Detailed Cost Report Functions ---

// --- START: Other Vehicle Costs Data & Functions ---
let otherVehicleCostsData = [
  { id: 'ovc1', vehicleId: 'v1', monthYear: '2024-01', description: 'Phí gửi xe tháng 1', amount: 500000 },
  { id: 'ovc2', vehicleId: 'v1', monthYear: '2024-01', description: 'Bảo hiểm xe quý 1', amount: 1500000 },
  { id: 'ovc3', vehicleId: 'v2', monthYear: '2024-01', description: 'Sửa chữa lặt vặt', amount: 300000 },
  { id: 'ovc4', vehicleId: 'v1', monthYear: '2024-02', description: 'Phí gửi xe tháng 2', amount: 500000 },
  { id: 'ovc5', vehicleId: 'v3', monthYear: '2024-02', description: 'Thay lốp', amount: 4000000 },
  { id: 'ovc6', vehicleId: 'v2', monthYear: '2024-03', description: 'Đăng kiểm', amount: 1000000 },
];
// --- END: Other Vehicle Costs Data & Functions ---

// --- START: Vehicle Monthly Details Report Functions ---
export const getAvailableMonthsForReport = () => { /* ... */ };
export const getVehicleMonthlyDetailsReport = (vehicleId, monthYear) => { /* ... */ };
// --- END: Vehicle Monthly Details Report Functions ---

// --- START: Debt Report Data & Functions ---
let debtReportData = [ /* ... */ ];
export const getDebtReport = (monthYear) => { /* ... */ };
export const getAvailableMonthsForDebtReport = () => { /* ... */ };
// --- END: Debt Report Data & Functions ---


// Keep other existing mock data exports
export const mockEmployees = mockEmployeesOld; 
export { mockCustomers, mockPartners, mockSchedules, mockCosts };
