// Authentication and user management mock data

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
    label: 'Lái xe',
    color: 'border-gray-200 bg-gray-50 text-gray-500',
    selected: 'bg-blue-100 border-blue-400 text-black',
  },
];

// Authentication functions
export const getUserByUsername = username => {
  return users[username] || null;
};

export const verifyCredentials = (username, password) => {
  const user = getUserByUsername(username);
  return user && user.password === password ? user : null;
};
