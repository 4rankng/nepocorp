import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext';
import { ROLES, getRoleLabel } from '@/config/roles';
import ThanhTieuDe from '@/components/ThanhTieuDe';
import ThanhBen from '@/components/ThanhBen';
import ChangelogDialog from '@/components/ChangelogDialog';
import packageJson from '../../package.json';
const ROLE_CARDS = [
  {
    key: ROLES.QUAN_LY,
    label: getRoleLabel(ROLES.QUAN_LY),
    desc: 'Xem giao diện quản lý',
    color: 'bg-blue-100 border-blue-400',
    fullName: 'Nguyễn Văn Phú',
    enabled: true,
  },
  {
    key: ROLES.KE_TOAN,
    label: getRoleLabel(ROLES.KE_TOAN),
    desc: 'Xem giao diện kế toán',
    color: 'bg-yellow-100 border-yellow-400',
    fullName: 'Tạ Thị Linh',
    enabled: false,
  },
  {
    key: ROLES.GIAO_NHAN,
    label: getRoleLabel(ROLES.GIAO_NHAN),
    desc: 'Xem giao diện giao nhận',
    color: 'bg-green-100 border-green-400',
    fullName: 'Lưu Đức Cường',
    enabled: false,
  },
  {
    key: ROLES.LAI_XE,
    label: getRoleLabel(ROLES.LAI_XE),
    desc: 'Xem giao diện lái xe',
    color: 'bg-purple-100 border-purple-400',
    fullName: 'Ngô Tử Đức',
    enabled: false,
  },
];
const TrangChu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const { login, logout, currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Auto-navigate authenticated users from root path to their default page
  useEffect(() => {
    if (isAuthenticated && currentUser && location.pathname === '/') {
      // Navigate based on role (AuthContext handles QUAN_LY redirect from /)
      switch (currentUser.role) {
        // case ROLES.QUAN_LY: is handled by AuthContext if landing on / or /bao-cao
        case ROLES.KE_TOAN:
          navigate('/chi-phi', { replace: true });
          break;
        case ROLES.GIAO_NHAN:
          navigate('/don-hang', { replace: true });
          break;
        case ROLES.LAI_XE:
          navigate('/lich-lam-viec', { replace: true });
          break;
        default:
          // Stay on root if role is unknown or QUAN_LY (AuthContext will redirect if needed)
          break;
      }
    }
  }, [isAuthenticated, currentUser, location.pathname, navigate]);
  const handleSidebarToggle = () => setSidebarOpen(open => !open);
  const handleSidebarClose = () => setSidebarOpen(false);
  const handleRoleSelect = async roleKey => {
    const success = login(roleKey);
    if (success) {
      // Navigate based on role (AuthContext.login handles QUAN_LY redirect)
      switch (roleKey) {
        // case ROLES.QUAN_LY: is handled by AuthContext.login()
        case ROLES.KE_TOAN:
          navigate('/chi-phi');
          break;
        case ROLES.GIAO_NHAN:
          navigate('/don-hang');
          break;
        case ROLES.LAI_XE:
          navigate('/lich-lam-viec');
          break;
        default:
          // For QUAN_LY, AuthContext.login already navigated.
          // For other roles not listed or if default needed.
          if (roleKey !== ROLES.QUAN_LY) {
            navigate('/');
          }
          break;
      }
    }
  };
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
      Bản Demo v{packageJson.version}
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
      {/* Banner/Header always visible */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full" style={{ minWidth: 0 }}>
        <ThanhTieuDe onSidebarToggle={handleSidebarToggle} sidebarOpen={sidebarOpen} />
      </div>
      {/* If no role, show role selection cards centered on white, no sidebar, no overlay */}
      {!currentUser && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-24 bg-white">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Chọn Vai Trò</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            {ROLE_CARDS.map(role => (
              <button
                key={role.key}
                onClick={() => role.enabled && handleRoleSelect(role.key)}
                className={`p-6 rounded-xl border-2 relative transition-all duration-200 text-left ${
                  role.enabled
                    ? `${role.color} hover:shadow-lg cursor-pointer`
                    : 'bg-gray-100 border-gray-300 opacity-75 cursor-not-allowed'
                }`}
                disabled={!role.enabled}
              >
                {!role.enabled && (
                  <div className="absolute top-3 right-3 bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                    Coming Soon
                  </div>
                )}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{role.label}</h3>
                <p className="text-gray-600">{role.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Main Layout Container, only show if role is picked */}
      {currentUser && (
        <div className="flex pt-12 w-full">
          {/* Fixed Sidebar for desktop */}
          <div className="hidden md:block fixed top-12 left-0 bottom-0 z-40">
            <ThanhBen onNavItemClick={handleSidebarClose} />
          </div>
          {/* Mobile Sidebar Overlay */}
          <div
            className={`fixed top-12 left-0 right-0 bottom-0 z-40 flex md:hidden ${
              sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            {/* Backdrop */}
            <div
              className={`fixed inset-0 bg-black transition-opacity duration-300 ease-out ${
                sidebarOpen ? 'bg-opacity-30' : 'bg-opacity-0'
              }`}
              style={{ top: 48 }}
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
          <main className="flex-1 md:ml-64 min-h-screen bg-white w-full">
            <div className="p-2 sm:p-4 w-full relative min-h-screen">
              <Outlet />
            </div>
          </main>
        </div>
      )}
    </div>
  );
};
export default TrangChu;
