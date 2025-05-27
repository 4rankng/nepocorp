import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import logo from '@/assets/logo.svg';

const ThanhTieuDe = ({ onSidebarToggle, sidebarOpen }) => {
  const { currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

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

        {currentUser && (
          <div className="flex items-center">
            <div className="relative">
              <button
                type="button"
                className="flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                id="user-menu-button"
                aria-expanded={isMenuOpen}
                aria-haspopup="true"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                  {currentUser.name
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </div>
                <span className="ml-2 font-medium text-gray-700 hidden sm:inline">
                  {currentUser.name}
                </span>
              </button>

              {/* Dropdown menu */}
              {isMenuOpen && (
                <div
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex="-1"
                >
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default ThanhTieuDe;
