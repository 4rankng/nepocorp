import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo.svg';

const ThanhTieuDe = ({ onSidebarToggle, sidebarOpen, userName, hideAvatar, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm h-12">
      <div className="flex items-center h-full justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center flex-shrink-0">
          <button
            className="relative md:hidden mr-2 p-2 rounded hover:bg-gray-100 focus:outline-none" // Added relative for absolute positioning of child SVGs
            onClick={onSidebarToggle}
            aria-label={sidebarOpen ? 'Đóng menu' : 'Mở menu'}
          >
            {/* Hamburger Icon */}
            <svg
              className={`h-6 w-6 transition-opacity duration-300 ease-in-out ${sidebarOpen ? 'opacity-0' : 'opacity-100'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            {/* X Icon */}
            <svg
              className={`h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ease-in-out ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <Link to="/" className="flex items-center">
            <img className="h-8 w-auto" src={logo} alt="NePO Transport" />
            <span className="ml-2 text-xl font-semibold">NePO Transport</span>
          </Link>
        </div>

        <div className="flex items-center">
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center text-gray-700 hover:text-gray-900"
            >
              <span className="mr-2 hidden sm:block">{userName}</span>
              {!hideAvatar && (
                <img
                  src="https://ui-avatars.com/api/?name=NVQL&background=0D8ABC&color=fff"
                  alt="avatar"
                  className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                />
              )}
            </button>

            {/* User menu dropdown - always rendered, visibility and animation controlled by classes */}
            <div
              className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5
                          transition-opacity transition-transform duration-150 ease-out
                          ${isMenuOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
            >
              <div className="py-1">
                <Link
                  to="/thiet-lap-email"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Thiết lập email
                </Link>
                <Link
                  to="/doi-mat-khau"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Đổi mật khẩu
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ThanhTieuDe;
