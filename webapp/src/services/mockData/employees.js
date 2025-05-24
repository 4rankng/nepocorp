// Employee management mock data and functions

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

// Mock employees for backward compatibility
export const mockEmployeesOld = [
  { id: 'E001', name: 'Nguyễn Văn A', position: 'Lái xe' },
  { id: 'E002', name: 'Trần Thị B', position: 'Kế toán' },
];

// Employee functions
export const getEmployees = () => new Promise(res => setTimeout(() => res([...employeesData]), 50));

const validateEmployeeData = (employeeData, id = null) => {
  if (!employeeData.tenNhanVien?.trim()) return 'Tên nhân viên không được để trống.';
  if (!employeeData.tenDangNhap?.trim()) return 'Tên đăng nhập không được để trống.';
  if (!employeeData.matKhau?.trim()) return 'Mật khẩu không được để trống.';
  if (!employeeData.email?.trim()) return 'Email không được để trống.';
  if (!employeeData.chucVu?.trim()) return 'Chức vụ không được để trống.';

  const existingEmployee = employeesData.find(
    e => e.tenDangNhap === employeeData.tenDangNhap.trim() && e.id !== id
  );
  if (existingEmployee) return 'Tên đăng nhập đã tồn tại.';

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
      id: String(Date.now()),
      ...employeeData,
      tenNhanVien: employeeData.tenNhanVien.trim(),
      tenDangNhap: employeeData.tenDangNhap.trim(),
      email: employeeData.email.trim(),
      chucVu: employeeData.chucVu.trim(),
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
      tenNhanVien: updatedEmployeeData.tenNhanVien.trim(),
      tenDangNhap: updatedEmployeeData.tenDangNhap.trim(),
      email: updatedEmployeeData.email.trim(),
      chucVu: updatedEmployeeData.chucVu.trim(),
    };
    resolve(employeesData[index]);
  });

export const deleteEmployee = id =>
  new Promise(resolve => {
    employeesData = employeesData.filter(e => e.id !== id);
    resolve({ id });
  });
