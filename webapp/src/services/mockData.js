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
    // Transport schedule data
    plans: [
      {
        id: 1,
        date: '2025-05-28',
        vehicleNumber: '51C-12345',
        partner: 'Công ty ABC',
        description: 'Chở hàng điện tử',
        route: 'Cảng Cát Lái - KCN Sóng Thần',
        status: 'Lên lịch',
        kmLaden: 120,
        kmEmpty: 30,
        fuelLiters: 40,
        fuelPrice: 25000,
        fuelCost: 1000000,
        roadAllowance: 500000,
        otherCosts: 200000,
      },
      {
        id: 2,
        date: '2025-05-29',
        vehicleNumber: '29H-67890',
        partner: 'Công ty XYZ',
        description: 'Chở hàng may mặc',
        route: 'KCN Tân Tạo - Cảng Cái Mép',
        status: 'Đang chạy',
        kmLaden: 150,
        kmEmpty: 40,
        fuelLiters: 50,
        fuelPrice: 25000,
        fuelCost: 1250000,
        roadAllowance: 600000,
        otherCosts: 300000,
      },
    ],
  },
  ketoan: {
    plans: [
      {
        id: 'P001',
        date: '2025-05-28',
        customer: 'Công ty X',
        status: 'new',
        details: 'Chở hàng điện tử',
        notesRead: false,
      },
      {
        id: 'P002',
        date: '2025-05-29',
        customer: 'Công ty Y',
        status: 'new',
        details: 'Chở hàng may mặc',
        notesRead: false,
      },
      {
        id: 'P003',
        date: '2025-05-25',
        customer: 'Công ty Z',
        status: 'viewed',
        details: 'Chở hàng nông sản',
        notesRead: true,
      },
      {
        id: 'P004',
        date: '2025-05-26',
        customer: 'Công ty A',
        status: 'completed',
        details: 'Chở vật liệu xây dựng',
        notesRead: true,
      },
    ],
    vehicles: [
      { id: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
      { id: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
      { id: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
    ],
  },
  giaonhan: {
    schedule: [
      {
        id: 'S001',
        date: '2025-05-28',
        tripId: 'T101',
        customer: 'Công ty Alpha',
        origin: 'Cảng Cát Lái',
        destination: 'KCN Sóng Thần',
        status: 'Chưa thực hiện',
        contNumber: '',
        sealNumber: '',
      },
      {
        id: 'S002',
        date: '2025-05-28',
        tripId: 'T102',
        customer: 'Công ty Beta',
        origin: 'KCN Tân Tạo',
        destination: 'Cảng Cái Mép',
        status: 'Đang thực hiện',
        contNumber: 'CONT2345',
        sealNumber: 'SEALB678',
      },
      {
        id: 'S003',
        date: '2025-05-29',
        tripId: 'T103',
        customer: 'Công ty Gamma',
        origin: 'Cảng VICT',
        destination: 'KCN Amata',
        status: 'Chưa thực hiện',
        contNumber: '',
        sealNumber: '',
      },
    ],
  },
  laixe: {
    trips: [
      {
        id: 'T001',
        ngayDi: '2025-05-21',
        ngayDen: '2025-05-21',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
      {
        id: 'T002',
        ngayDi: '2025-05-22',
        ngayDen: '2025-05-22',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
      {
        id: 'T003',
        ngayDi: '2025-05-23',
        ngayDen: '2025-05-23',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
      {
        id: 'T004',
        ngayDi: '2025-05-24',
        ngayDen: '2025-05-24',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
      {
        id: 'T005',
        ngayDi: '2025-05-25',
        ngayDen: '2025-05-25',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
      {
        id: 'T006',
        ngayDi: '2025-05-25',
        ngayDen: '2025-05-25',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
      {
        id: 'T007',
        ngayDi: '2025-05-25',
        ngayDen: '2025-05-21',
        bienSoXe: '15C-7661H',
        troCap: 2000000,
        dau: 40,
      },
    ],
  },
  // Financial report data
  financialReport: [
    {
      vehicle: '51C-12345',
      month: 'Tháng 5 2025',
      revenue: 15000000,
      profit: 5000000
    },
    {
      vehicle: '29H-67890',
      month: 'Tháng 5 2025',
      revenue: 18000000,
      profit: 6000000
    },
    {
      vehicle: '60A-11223',
      month: 'Tháng 5 2025',
      revenue: 12000000,
      profit: 4000000
    },
    {
      vehicle: '51C-12345',
      month: 'Tháng 4 2025',
      revenue: 14000000,
      profit: 4500000
    },
    {
      vehicle: '29H-67890',
      month: 'Tháng 4 2025',
      revenue: 16000000,
      profit: 5500000
    },
    {
      vehicle: '60A-11223',
      month: 'Tháng 4 2025',
      revenue: 11000000,
      profit: 3500000
    }
  ]
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
export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    fullName: 'Nguyễn Văn A',
    email: 'admin@nepo.com',
    role: 'Quản lý',
  },
  {
    id: 2,
    username: 'ketoan',
    password: 'ketoan123',
    fullName: 'Trần Thị B',
    email: 'ketoan@nepo.com',
    role: 'Kế toán',
  },
];

// Mock data for vehicles
export const mockVehicles = [
  { id: 1, licensePlate: '51F-12345', status: 'Hoạt động' },
  { id: 2, licensePlate: '51F-67890', status: 'Hoạt động' },
  { id: 3, licensePlate: '51F-54321', status: 'Bảo trì' },
];

// Mock data for containers
export const mockContainers = [
  { id: 1, type: '20\'DC', description: 'Container 20 feet Dry' },
  { id: 2, type: '40\'DC', description: 'Container 40 feet Dry' },
  { id: 3, type: '40\'HC', description: 'Container 40 feet High Cube' },
  { id: 4, type: '40\'RF', description: 'Container 40 feet Reefer' },
  { id: 5, type: '40\'OT', description: 'Container 40 feet Open Top' },
  { id: 6, type: '45\'HC', description: 'Container 45 feet High Cube' },
];

// Mock data for employees
export const mockEmployees = [
  {
    id: 1,
    fullName: 'Nguyễn Văn A',
    username: 'nguyenvana',
    email: 'nguyenvana@nepo.com',
    position: 'Quản lý'
  },
  {
    id: 2,
    fullName: 'Trần Thị B',
    username: 'tranthib',
    email: 'tranthib@nepo.com',
    position: 'Kế toán'
  },
  {
    id: 3,
    fullName: 'Lê Văn C',
    username: 'levanc',
    email: 'levanc@nepo.com',
    position: 'Giao nhận'
  },
  {
    id: 4,
    fullName: 'Phạm Thị D',
    username: 'phamthid',
    email: 'phamthid@nepo.com',
    position: 'Lái xe'
  }
];

// Mock data for customers
export const mockCustomers = [
  { id: 1, name: 'Công ty TNHH ABC', address: '123 Đường ABC, Quận 1, TP.HCM', phone: '0123456789' },
  { id: 2, name: 'Công ty XYZ', address: '456 Đường XYZ, Quận 2, TP.HCM', phone: '0987654321' },
  { id: 3, name: 'Công ty DEF', address: '789 Đường DEF, Quận 3, TP.HCM', phone: '0123987456' },
];

// Mock data for partners
export const mockPartners = [
  { id: 1, name: 'Đối tác A', address: '123 Đường A, Quận 1, TP.HCM', phone: '0123456789' },
  { id: 2, name: 'Đối tác B', address: '456 Đường B, Quận 2, TP.HCM', phone: '0987654321' },
  { id: 3, name: 'Đối tác C', address: '789 Đường C, Quận 3, TP.HCM', phone: '0123987456' },
];

// Mock data for transport schedules
export const mockSchedules = [
  {
    id: 1,
    date: '2024-03-01',
    vehicleId: 1,
    partnerId: 1,
    description: 'Vận chuyển hàng từ HCM đến HN',
    route: 'HCM - HN',
    status: 'completed',
    kilometers: 1800,
    fuelCost: 5000000,
    otherCosts: 2000000,
  },
  {
    id: 2,
    date: '2024-03-02',
    vehicleId: 2,
    partnerId: 2,
    description: 'Vận chuyển hàng từ HCM đến Đà Nẵng',
    route: 'HCM - Đà Nẵng',
    status: 'in_progress',
    kilometers: 1000,
    fuelCost: 3000000,
    otherCosts: 1500000,
  },
];

// Mock data for costs
export const mockCosts = [
  { id: 1, type: 'Nhiên liệu', amount: 5000000, date: '2024-03-01', vehicleId: 1 },
  { id: 2, type: 'Bảo trì', amount: 2000000, date: '2024-03-02', vehicleId: 1 },
  { id: 3, type: 'Phí đường bộ', amount: 1000000, date: '2024-03-03', vehicleId: 2 },
  { id: 4, type: 'Lương lái xe', amount: 8000000, date: '2024-03-01', vehicleId: 1 },
  { id: 5, type: 'Bảo hiểm', amount: 3000000, date: '2024-03-01', vehicleId: 2 },
];
