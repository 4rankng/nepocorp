import { useState, useRef, useEffect } from 'react';

export default function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 focus:outline-none text-gray-800"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="hidden sm:inline font-medium">{user?.fullName || 'Người dùng'}</span>
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <svg
          className="w-4 h-4 hidden sm:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white border rounded shadow-lg z-50">
          <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">
            Thiết lập email
          </button>
          <button className="block w-full text-left px-4 py-2 hover:bg-gray-100">
            Đổi mật khẩu
          </button>
          <button
            className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
            onClick={() => {
              onLogout();
              setOpen(false);
            }}
          >
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}
