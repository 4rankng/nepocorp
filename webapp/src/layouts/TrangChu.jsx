import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import ThanhTieuDe from '@/components/ThanhTieuDe';
import ThanhBen from '@/components/ThanhBen';
import ChangelogDialog from '@/components/ChangelogDialog';
import LoginModal from '@/components/LoginModal';
import packageJson from '../../package.json';
import { Box, Typography, Button } from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';

const TrangChu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { logout, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-navigate authenticated users from root path to their default page
  useEffect(() => {
    if (isAuthenticated && currentUser && location.pathname === '/') {
      navigate('/lich-van-chuyen', { replace: true });
    }
  }, [isAuthenticated, currentUser, location.pathname, navigate]);

  const handleSidebarToggle = () => setSidebarOpen(open => !open);
  const handleSidebarClose = () => setSidebarOpen(false);
  const handleDesktopSidebarToggle = () => setDesktopSidebarCollapsed(collapsed => !collapsed);

  const handleLogout = () => {
    logout();
    setSidebarOpen(false);
  };

  // Version badge component
  const VersionBadge = () => (
    <button
      onClick={() => setChangelogOpen(true)}
      className="fixed bottom-4 left-4 bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-gray-500 border border-gray-200 shadow-sm z-50 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-all"
    >
      v{packageJson.version}
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden">
      {/* Version badge - always visible */}
      <VersionBadge />

      {/* Changelog Dialog */}
      <ChangelogDialog
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        version={packageJson.version}
      />

      {/* Login Modal */}
      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      {/* Banner/Header only visible when authenticated */}
      {currentUser && (
        <ThanhTieuDe onSidebarToggle={handleSidebarToggle} sidebarOpen={sidebarOpen} />
      )}

      {/* If not authenticated, show landing page with login button */}
      {!currentUser && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            px: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          }}
        >
          <Box
            sx={{
              textAlign: 'center',
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              NEPOCORP
            </Typography>
            <Typography
              variant="h5"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Hệ thống quản lý vận tải
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<LoginIcon />}
              onClick={() => setLoginModalOpen(true)}
              sx={{
                py: 1.5,
                px: 4,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                },
              }}
            >
              Đăng nhập
            </Button>
          </Box>
        </Box>
      )}

      {/* Main Layout Container, only show if authenticated */}
      {currentUser && (
        <div className="flex pt-16 w-full">
          {/* Fixed Sidebar for desktop */}
          <div
            className={`hidden md:block fixed top-16 left-0 bottom-0 z-40 transition-transform duration-300 ease-in-out ${
              desktopSidebarCollapsed ? '-translate-x-full' : 'translate-x-0'
            }`}
          >
            <ThanhBen onNavItemClick={handleSidebarClose} />
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={handleDesktopSidebarToggle}
            className={`hidden md:flex fixed bottom-16 z-50 w-6 h-12 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-r-md items-center justify-center transition-all duration-300 ease-in-out ${
              desktopSidebarCollapsed ? 'left-0' : 'left-64'
            }`}
            aria-label={desktopSidebarCollapsed ? 'Mở sidebar' : 'Thu gọn sidebar'}
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                desktopSidebarCollapsed ? 'rotate-0' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Mobile Sidebar Overlay */}
          <div
            className={`fixed top-16 left-0 right-0 bottom-0 z-40 flex md:hidden ${
              sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black transition-opacity duration-300 ease-out ${
                sidebarOpen ? 'bg-opacity-30' : 'bg-opacity-0'
              }`}
              style={{ top: 64 }}
              onClick={handleSidebarClose}
            ></div>

            {/* Mobile Sidebar */}
            <div
              className={`relative z-50 w-64 bg-white h-full shadow-lg transition-transform duration-300 ease-out transform ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
              <ThanhBen onNavItemClick={handleSidebarClose} />
            </div>
          </div>

          {/* Main Content */}
          <main
            className={`flex-1 min-h-screen w-full transition-all duration-300 ease-in-out ${
              desktopSidebarCollapsed ? 'md:ml-0' : 'md:ml-64'
            }`}
            style={{ 
              backgroundColor: '#f0f2f5',
              minHeight: 'calc(100vh - 64px)' 
            }}
          >
            <div 
              className="p-8 w-full relative"
              style={{ 
                backgroundColor: '#ffffff',
                minHeight: 'calc(100vh - 64px)'
              }}
            >
              <Outlet />
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default TrangChu;
