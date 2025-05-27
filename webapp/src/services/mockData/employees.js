// Employee management mock data and functions

export const employeeRoles = ['Quản lý', 'Kế toán', 'Giao nhận', 'Lái xe'];

let employeesData = [
  {
    id: 'emp1',
    maNhanVien: 'NV001',
    tenNhanVien: 'Nguyễn Văn An',
    tenDangNhap: 'an.nv',
    matKhau: 'password123',
    email: 'an.nv@example.com',
    chucVu: 'Quản lý',
    bienSoXe: '',
  },
  {
    id: 'emp2',
    maNhanVien: 'NV002',
    tenNhanVien: 'Trần Thị Bình',
    tenDangNhap: 'binh.tt',
    matKhau: 'password123',
    email: 'binh.tt@example.com',
    chucVu: 'Kế toán',
    bienSoXe: '',
  },
  {
    id: 'emp3',
    maNhanVien: 'NV003',
    tenNhanVien: 'Lê Văn Cường',
    tenDangNhap: 'cuong.lv',
    matKhau: 'password123',
    email: 'cuong.lv@example.com',
    chucVu: 'Giao nhận',
    bienSoXe: '',
  },
  {
    id: 'emp4',
    maNhanVien: 'NV004',
    tenNhanVien: 'Phạm Thị Dung',
    tenDangNhap: 'dung.pt',
    matKhau: 'password123',
    email: 'dung.pt@example.com',
    chucVu: 'Lái xe',
    bienSoXe: '51C-12345',
  },
  {
    id: 'emp5',
    maNhanVien: 'NV005',
    tenNhanVien: 'Hoàng Văn Em',
    tenDangNhap: 'em.hv',
    matKhau: 'password123',
    email: 'em.hv@example.com',
    chucVu: 'Lái xe',
    bienSoXe: '29H-54321',
  },
];

// Mock employees for backward compatibility
export const mockEmployeesOld = [
  { id: 'E001', name: 'Nguyễn Văn A', position: 'Lái xe' },
  { id: 'E002', name: 'Trần Thị B', position: 'Kế toán' },
];

// Employee functions
export const getEmployees = () => new Promise(res => setTimeout(() => res([...employeesData]), 50));

const validateEmployeeData = (employeeData, id = null) => {
  if (!employeeData.maNhanVien?.trim()) return 'Mã nhân viên không được để trống.';
  if (!employeeData.tenNhanVien?.trim()) return 'Tên nhân viên không được để trống.';
  if (!employeeData.tenDangNhap?.trim()) return 'Tên đăng nhập không được để trống.';
  if (!employeeData.matKhau?.trim() && !id) return 'Mật khẩu không được để trống.';
  if (!employeeData.email?.trim()) return 'Email không được để trống.';
  if (!employeeData.chucVu?.trim()) return 'Chức vụ không được để trống.';

  // Validate employee code format (NV followed by numbers)
  const employeeCodeRegex = /^NV\d{3,}$/;
  if (!employeeCodeRegex.test(employeeData.maNhanVien.trim())) {
    return 'Mã nhân viên phải bắt đầu bằng NV và theo sau là ít nhất 3 chữ số (VD: NV001)';
  }

  // Check for duplicate employee code
  const existingEmployeeWithSameCode = employeesData.find(
    e => e.maNhanVien === employeeData.maNhanVien.trim() && e.id !== id
  );
  if (existingEmployeeWithSameCode) return 'Mã nhân viên đã tồn tại.';

  // Check for duplicate username
  const existingEmployeeWithSameUsername = employeesData.find(
    e => e.tenDangNhap === employeeData.tenDangNhap.trim() && e.id !== id
  );
  if (existingEmployeeWithSameUsername) return 'Tên đăng nhập đã tồn tại.';

  // If role is driver, ensure a vehicle is assigned
  if (employeeData.chucVu === 'Lái xe' && !employeeData.bienSoXe?.trim()) {
    return 'Vui lòng chọn biển số xe cho lái xe.';
  }

  return null;
};

export const addEmployee = employeeData =>
  new Promise((resolve, reject) => {
    const err = validateEmployeeData(employeeData);
    if (err) {
      reject(new Error(err));
      return;
    }
    const newEmployee = {
      id: `emp${Date.now()}`,
      maNhanVien: employeeData.maNhanVien.trim().toUpperCase(),
      tenNhanVien: employeeData.tenNhanVien.trim(),
      tenDangNhap: employeeData.tenDangNhap.trim(),
      matKhau: employeeData.matKhau.trim(),
      email: employeeData.email.trim(),
      chucVu: employeeData.chucVu.trim(),
      bienSoXe: employeeData.bienSoXe ? employeeData.bienSoXe.trim() : '',
    };
    employeesData.push(newEmployee);
    resolve(newEmployee);
  });

export const updateEmployee = (id, updatedEmployeeData) =>
  new Promise((resolve, reject) => {
    const err = validateEmployeeData(updatedEmployeeData, id);
    if (err) {
      reject(new Error(err));
      return;
    }
    const index = employeesData.findIndex(e => e.id === id);
    if (index === -1) {
      reject(new Error('Không tìm thấy nhân viên'));
      return;
    }
    employeesData[index] = {
      ...employeesData[index],
      ...updatedEmployeeData,
      maNhanVien: updatedEmployeeData.maNhanVien.trim().toUpperCase(),
      tenNhanVien: updatedEmployeeData.tenNhanVien.trim(),
      tenDangNhap: updatedEmployeeData.tenDangNhap.trim(),
      // Only update password if it was provided
      ...(updatedEmployeeData.matKhau ? { matKhau: updatedEmployeeData.matKhau.trim() } : {}),
      email: updatedEmployeeData.email.trim(),
      chucVu: updatedEmployeeData.chucVu.trim(),
      bienSoXe: updatedEmployeeData.bienSoXe ? updatedEmployeeData.bienSoXe.trim() : '',
    };
    resolve(employeesData[index]);
  });

export const deleteEmployee = id =>
  new Promise(resolve => {
    employeesData = employeesData.filter(e => e.id !== id);
    resolve({ id });
  });
