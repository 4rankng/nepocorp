import React from 'react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/bao-cao', label: 'Báo cáo tài chính', icon: '📊' },
  { path: '/lich-van-chuyen', label: 'Lịch vận chuyển', icon: '📅' },
  { path: '/nhan-vien', label: 'Nhân viên', icon: '👥' },
  { path: '/khach-hang', label: 'Khách hàng', icon: '👤' },
  { path: '/doi-tac', label: 'Đối tác', icon: '🤝' },
  { path: '/phuong-tien', label: 'Phương tiện', icon: '🚛' },
  { path: '/container', label: 'Loại container', icon: '📦' },
  { path: '/chi-phi', label: 'Chi phí', icon: '💰' },
];

const ThanhBen = () => {
  return (
    <aside className="w-64 bg-white md:fixed md:top-12 md:left-0 md:h-[calc(100vh-3rem)] md:z-40">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  );
};

export default ThanhBen;
