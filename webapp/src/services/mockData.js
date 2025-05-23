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
    plans: [], // Simplified, main data below
  },
  ketoan: {
    plans: [],
    plans: [],
    vehicles: [
      { id: 'V001', bienSo: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
      { id: 'V002', bienSo: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
      { id: 'V003', bienSo: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
      { id: 'V001', bienSo: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
      { id: 'V002', bienSo: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
      { id: 'V003', bienSo: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
    ],
  },
  giaonhan: { schedule: [] },
  laixe: { trips: [] },
  financialReport: [] // Old, will be replaced by new function
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
  { id: 'ct1', name: "20'DC" },
  { id: 'ct2', name: "40'DC" },
  { id: 'ct3', name: "40'HC" },
  { id: 'ct4', name: "20'RF" },
  { id: 'ct5', name: "45'HC" },
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
  { id: 'ct1', name: "20'DC" },
  { id: 'ct2', name: "40'DC" },
  { id: 'ct3', name: "40'HC" },
  { id: 'ct4', name: "20'RF" },
  { id: 'ct5', name: "45'HC" },
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
let shipmentPlansData = [
  {
    id: 'sp1', ngayThang: '01/01/2024', bienSoXeId: 'v1', bienSoXe: '51C-12345', doiTacId: 'p1', tenDoiTac: 'Đối tác Vận Tải An Phát',
    dienGiai: 'Chở hàng Tết đợt 1', tuyenDuong: { diemDi: 'Kho A', diemDen: ['Kho B', 'Kho C'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct1', tenLoaiContainer: "20'DC",
    cuocVanChuyen: 5000000, thongTinContainer: [{ soContainer: 'CONT111', soSeal: 'SEAL111' }],
    ngayHaHang: '02/01/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    costFuel: 2000000, costTolls: 500000, costMaintenance: 200000, chiPhiKhac: { "Bốc xếp": 300000, "Lưu kho": 100000 },
    totalCost: 3100000, dauLit: 100, dauDong: 2000000, phiDiDuong: 500000,
    tongChiPhiPhuongTien: 2500000, loiNhuanPhuongTien: 2500000,
  },
  {
    id: 'sp2', ngayThang: '15/01/2024', bienSoXeId: 'v2', bienSoXe: '29H-54321', doiTacId: '', tenDoiTac: '-',
    dienGiai: 'Giao hàng cho siêu thị XYZ', tuyenDuong: { diemDi: 'Cảng X', diemDen: ['Siêu thị Y'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust2', tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics', loaiContainerId: 'ct2', tenLoaiContainer: "40'DC",
    cuocVanChuyen: 7500000, thongTinContainer: [{ soContainer: 'CONT222', soSeal: 'SEAL222' }],
    ngayHaHang: '15/01/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    costFuel: 3000000, costTolls: 700000, costMaintenance: 300000, chiPhiKhac: { "Phí cảng": 400000 },
    totalCost: 4400000, dauLit: 150, dauDong: 3000000, phiDiDuong: 700000,
    tongChiPhiPhuongTien: 3700000, loiNhuanPhuongTien: 3800000,
  },
  {
    id: 'sp3', ngayThang: '05/02/2024', bienSoXeId: 'v1', bienSoXe: '51C-12345', doiTacId: '', tenDoiTac: '-',
    dienGiai: 'Vận chuyển hàng đông lạnh', tuyenDuong: { diemDi: 'Kho Lạnh A', diemDen: ['Kho Lạnh B'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct4', tenLoaiContainer: "20'RF",
    cuocVanChuyen: 6000000, thongTinContainer: [{ soContainer: 'CONT333', soSeal: 'SEAL333' }],
    ngayHaHang: '05/02/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    costFuel: 2500000, costTolls: 600000, costMaintenance: 400000, chiPhiKhac: {},
    totalCost: 3500000, dauLit: 120, dauDong: 2500000, phiDiDuong: 600000,
    tongChiPhiPhuongTien: 3100000, loiNhuanPhuongTien: 2900000,
  },
  {
    id: 'sp4', ngayThang: '20/02/2024', bienSoXeId: 'v3', bienSoXe: '60A-98765', doiTacId: 'p2', tenDoiTac: 'Công ty Logistics Toàn Cầu',
    dienGiai: 'Chuyến hàng quá khổ', tuyenDuong: { diemDi: 'Cảng Z', diemDen: ['Công trình K'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust2', tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics', loaiContainerId: 'ct5', tenLoaiContainer: "45'HC",
    cuocVanChuyen: 12000000, thongTinContainer: [{ soContainer: 'CONT444', soSeal: 'SEAL444' }],
    ngayHaHang: '21/02/2024', soLuongContainer: 1, cuocThueVanChuyen: 3000000,
    costFuel: 4000000, costTolls: 1000000, costMaintenance: 500000, chiPhiKhac: {"Giấy phép": 200000},
    totalCost: 5700000 + 3000000, dauLit: 200, dauDong: 4000000, phiDiDuong: 1000000,
    tongChiPhiPhuongTien: 5000000 + 3000000, loiNhuanPhuongTien: 4000000,
  },
  {
    id: 'sp5', ngayThang: '10/01/2024', bienSoXeId: 'v1', bienSoXe: '51C-12345', doiTacId: '', tenDoiTac: '-',
    dienGiai: 'Chở hàng lẻ', tuyenDuong: { diemDi: 'Kho M', diemDen: ['Kho N'] }, trangThai: 'Hoàn thành',
    khachHangId: 'cust2', tenKhachHang: 'Doanh nghiệp tư nhân XYZ Logistics', loaiContainerId: 'ct1', tenLoaiContainer: "20'DC",
    cuocVanChuyen: 4000000, thongTinContainer: [{ soContainer: 'CONT555', soSeal: 'SEAL555' }],
    ngayHaHang: '10/01/2024', soLuongContainer: 1, cuocThueVanChuyen: 0,
    costFuel: 1800000, costTolls: 400000, costMaintenance: 150000, chiPhiKhac: {},
    totalCost: 2350000, dauLit: 90, dauDong: 1800000, phiDiDuong: 400000,
    tongChiPhiPhuongTien: 2200000, loiNhuanPhuongTien: 1800000,
  },
  {
    id: 'sp6', ngayThang: '03/03/2024', bienSoXeId: 'v2', bienSoXe: '29H-54321', doiTacId: '', tenDoiTac: '-',
    dienGiai: 'Vận chuyển thiết bị y tế', tuyenDuong: { diemDi: 'Bệnh viện A', diemDen: ['Bệnh viện B'] }, trangThai: 'Lên lịch',
    khachHangId: 'cust1', tenKhachHang: 'Công ty TNHH ABC Vận Tải', loaiContainerId: 'ct2', tenLoaiContainer: "40'DC",
    cuocVanChuyen: 8000000, thongTinContainer: [{ soContainer: 'CONT666', soSeal: 'SEAL666' }],
    ngayHaHang: '', soLuongContainer: 1, cuocThueVanChuyen: 0,
    costFuel: 0, costTolls: 0, costMaintenance: 0, chiPhiKhac: {},
    totalCost: 0, dauLit: 0, dauDong: 0, phiDiDuong: 0,
    tongChiPhiPhuongTien: 0, loiNhuanPhuongTien: 0,
  }
];
export const getShipmentPlans = () => new Promise(res => setTimeout(() => res([...shipmentPlansData]), 50));
export const addShipmentPlan = (planData) => { /* ... */ };
export const updateShipmentPlan = (id, updatedPlanData) => { /* ... */ };
export const deleteShipmentPlan = (id) => { /* ... */ };

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
export const getAvailableMonthsForReport = () => { // Can be used for multiple reports if date source is consistent
  return new Promise((resolve) => {
    const uniqueMonths = new Set();
    shipmentPlansData.forEach(plan => {
      const [day, month, year] = plan.ngayThang.split('/');
      uniqueMonths.add(`${year}-${month}`);
    });
    otherVehicleCostsData.forEach(cost => { // Also consider months from other costs
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
  return new Promise((resolve) => {
    const relevantPlans = shipmentPlansData.filter(plan =>
      plan.bienSoXeId === vehicleId &&
      plan.ngayThang.endsWith(`/${monthYear.substring(5)}/${monthYear.substring(0,4)}`) && // Match MM/YYYY part
      plan.trangThai === 'Hoàn thành'
    );

    const relevantOtherCosts = otherVehicleCostsData.filter(cost =>
      cost.vehicleId === vehicleId && cost.monthYear === monthYear
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

    setTimeout(() => resolve({
      overview: {
        totalRevenue,
        totalShipmentCosts, // Costs directly from shipments
        totalOtherCosts: totalOtherCostsAmount, // Other general costs for the vehicle in that month
        grandTotalCosts,    // All costs combined
        grandTotalProfit,
      },
      shipmentDetails,
      otherCosts: relevantOtherCosts.map(c => ({ id: c.id, description: c.description, amount: c.amount })),
    }), 200);
  });
};
// --- END: Vehicle Monthly Details Report Functions ---

// --- START: Debt Report Data & Functions ---
let debtReportData = [
    { id: 'debt1', entityName: 'Công ty TNHH ABC Vận Tải', entityType: 'customer', monthYear: '2024-01', phaiThu: 15000000, phaiTra: 0, ghiChu: 'Thanh toán đúng hạn' },
    { id: 'debt2', entityName: 'Đối tác Vận Tải An Phát', entityType: 'partner', monthYear: '2024-01', phaiThu: 0, phaiTra: 5000000, ghiChu: 'Đã thanh toán 1 phần' },
    { id: 'debt3', entityName: 'Doanh nghiệp tư nhân XYZ Logistics', entityType: 'customer', monthYear: '2024-01', phaiThu: 8000000, phaiTra: 0, ghiChu: 'Chậm thanh toán' },
    { id: 'debt4', entityName: 'Công ty Logistics Toàn Cầu', entityType: 'partner', monthYear: '2024-02', phaiThu: 2000000, phaiTra: 12000000, ghiChu: '' },
    { id: 'debt5', entityName: 'Công ty TNHH ABC Vận Tải', entityType: 'customer', monthYear: '2024-02', phaiThu: 10000000, phaiTra: 0, ghiChu: 'Hợp đồng mới' },
    { id: 'debt6', entityName: 'Dịch vụ Kho Vận Miền Nam', entityType: 'partner', monthYear: '2024-02', phaiThu: 0, phaiTra: 3500000, ghiChu: 'Ưu đãi thanh toán sớm' },
    { id: 'debt7', entityName: 'Công ty Cổ Phần DEF Giao Nhận', entityType: 'customer', monthYear: '2024-03', phaiThu: 22000000, phaiTra: 0, ghiChu: 'Chưa thanh toán' },
];

export const getDebtReport = (monthYear) => {
    return new Promise((resolve) => {
        const filteredData = debtReportData.filter(item => item.monthYear === monthYear);
        setTimeout(() => resolve(filteredData), 200);
    });
};

export const getAvailableMonthsForDebtReport = () => {
    return new Promise((resolve) => {
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
export const mockCustomers = customersData;
export const mockPartners = partnersData;
