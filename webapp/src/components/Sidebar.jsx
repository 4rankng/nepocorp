// import { useState } from 'react'; // Removed useState

const navItems = [
  { key: 'report', label: 'Báo cáo tài chính' },
  { key: 'schedule', label: 'Lịch vận chuyển' },
  { key: 'staff', label: 'Nhân viên' },
  { key: 'customers', label: 'Khách hàng' },
  { key: 'partners', label: 'Đối tác' },
  { key: 'vehicles', label: 'Phương tiện' },
  { key: 'containers', label: 'Loại container' },
  { key: 'costs', label: 'Chi phí' },
];

export default function Sidebar({ active, onSelect, isMobileMenuOpen, onCloseMenu }) {
  // const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Removed local state

  return (
    <>
      {/* Mobile menu button - REMOVED */}
      {/* Mobile menu overlay - REMOVED */}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-white border-r border-gray-200 px-2 z-[45] transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } sm:translate-x-0 sm:fixed sm:top-16 sm:h-[calc(100vh-4rem)]`} // Adjusted classes for mobile and desktop
      >
        <nav className="flex flex-col gap-1 py-4">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`text-left px-4 py-2 rounded font-medium transition-colors duration-150 ${
                active === item.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => {
                onSelect(item.key);
                if (onCloseMenu) { // Call onCloseMenu if provided
                  onCloseMenu();
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
