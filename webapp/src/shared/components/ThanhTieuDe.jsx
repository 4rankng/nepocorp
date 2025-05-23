import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo.svg';

const ThanhTieuDe = ({ onSidebarToggle }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center h-12 justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center flex-shrink-0">
          <button
            className="md:hidden mr-2 p-2 rounded hover:bg-gray-100 focus:outline-none"
            onClick={onSidebarToggle}
            aria-label="Mở menu"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
              <span className="mr-2">Nguyễn Văn A</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <Link to="/thiet-lap-email" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Thiết lập email
                  </Link>
                  <Link to="/doi-mat-khau" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Đổi mật khẩu
                  </Link>
                  <button
                    onClick={() => {/* Handle logout */}}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ThanhTieuDe;
