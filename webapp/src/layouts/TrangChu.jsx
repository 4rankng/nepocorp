import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ThanhTieuDe from '../shared/components/ThanhTieuDe';
import ThanhBen from '../shared/components/ThanhBen';

const TrangChu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('manager'); // 'manager' or 'accountant'
  const [userName, setUserName] = useState('Nguyễn Văn Quản Lý'); // Example user name

  const handleSidebarToggle = () => setSidebarOpen(open => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  // Example function to simulate role change - for testing
  // const toggleUserRole = () => {
  //   if (currentUserRole === 'manager') {
  //     setCurrentUserRole('accountant');
  //     setUserName('Nguyễn Thị Kế Toán');
  //   } else {
  //     setCurrentUserRole('manager');
  //     setUserName('Nguyễn Văn Quản Lý');
  //   }
  // };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <ThanhTieuDe
          onSidebarToggle={handleSidebarToggle}
          sidebarOpen={sidebarOpen}
          userName={userName}
        />
      </div>

      {/* Main Layout Container */}
      <div className="flex pt-12">
        {' '}
        {/* Add padding-top to account for fixed header */}
        {/* Fixed Sidebar for desktop */}
        <div className="hidden md:block fixed top-12 left-0 bottom-0 z-40">
          <ThanhBen userRole={currentUserRole} onNavItemClick={handleSidebarClose} />
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
            <ThanhBen userRole={currentUserRole} onNavItemClick={handleSidebarClose} />
          </div>
        </div>
        {/* Main Content */}
        <main className="flex-1 md:ml-64 min-h-screen bg-white">
          <div className="p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TrangChu;
