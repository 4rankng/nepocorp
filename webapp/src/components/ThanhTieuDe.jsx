import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import ChangePasswordModal from './ChangePasswordModal';
import EditProfileModal from './EditProfileModal';

const ThanhTieuDe = ({ onSidebarToggle, sidebarOpen, onModalStateChange }) => {
  const { currentUser, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Notify parent about modal state changes
  React.useEffect(() => {
    const hasOpenModal = isChangePasswordModalOpen || isEditProfileModalOpen;
    if (onModalStateChange) {
      onModalStateChange(hasOpenModal);
    }
  }, [isChangePasswordModalOpen, isEditProfileModalOpen, onModalStateChange]);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  return (
    <header 
      className="h-16 shadow-md fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 25%, #f9f9f9 50%, #fafafa 75%, #ffffff 100%)',
        color: '#4b5563',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      {/* Left Section - Logo and Company Name */}
      <div className="flex items-center flex-shrink-0">
        {/* Mobile Hamburger Menu - Hidden when profile modals are open */}
        {!isChangePasswordModalOpen && !isEditProfileModalOpen && (
          <button
            className="relative md:hidden mr-3 p-2 rounded hover:bg-black/10 focus:outline-none transition-all duration-300"
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
        )}

        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{ 
              background: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 25%, #a8a8a8 50%, #c0c0c0 75%, #e8e8e8 100%)',
              color: '#2c2c2c',
              border: '1px solid #999999',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(0,0,0,0.1)',
              textShadow: '0 1px 0 rgba(255,255,255,0.8)'
            }}
          >
            N
          </div>
          <div 
            className="text-xl font-semibold"
            style={{ 
              letterSpacing: '0.5px',
              fontWeight: 600,
              color: '#4b5563'
            }}
          >
            NePO Transport
          </div>
        </Link>
      </div>

      {/* Right Section - Actions */}
      {currentUser && (
        <div className="flex items-center gap-5">
          {/* User Profile */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-all duration-300"
              id="user-menu-button"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {/* User Avatar */}
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                style={{ backgroundColor: '#6b7280' }}
              >
                {(currentUser.name || 'U')[0].toUpperCase()}
              </div>
              
              {/* User Info - Hidden on small screens */}
              <div className="text-left hidden sm:block">
                <div 
                  className="font-medium text-sm"
                  style={{ fontWeight: 500, color: '#4b5563' }}
                >
                  {currentUser.name}
                </div>
              </div>
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <div
                className="origin-top-right absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
                role="menu"
                aria-orientation="vertical"
                aria-labelledby="user-menu-button"
                tabIndex="-1"
                style={{
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}
              >
                <button
                  onClick={() => {
                    setIsChangePasswordModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  role="menuitem"
                  style={{ fontSize: '14px' }}
                >
                  Đổi mật khẩu
                </button>
                <button
                  onClick={() => {
                    setIsEditProfileModalOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  role="menuitem"
                  style={{ fontSize: '14px' }}
                >
                  Sửa thông tin
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  role="menuitem"
                  style={{ fontSize: '14px' }}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Modals */}
      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
      <EditProfileModal 
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />
    </header>
  );
};

export default ThanhTieuDe;