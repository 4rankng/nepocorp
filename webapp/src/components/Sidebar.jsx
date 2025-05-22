import { useState } from 'react';

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

export default function Sidebar({ active, onSelect }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="sm:hidden fixed top-0 left-0 w-16 h-16 bg-white border-b border-r border-gray-200 z-50 flex items-center justify-center">
        <button
          className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isMobileMenuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-gray-600 bg-opacity-75 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-56 bg-white border-r border-gray-200 px-2 z-[45] transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
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
                setIsMobileMenuOpen(false);
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
