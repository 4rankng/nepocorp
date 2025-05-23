import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ThanhTieuDe from '../shared/components/ThanhTieuDe';
import ThanhBen from '../shared/components/ThanhBen';

const TrangChu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState('manager'); // 'manager' or 'accountant'
  const [userName, setUserName] = useState('Nguyễn Văn Quản Lý'); // Example user name

  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
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
    <div className="flex flex-col h-screen">
      {/* <button onClick={toggleUserRole} className="absolute top-0 right-60 z-50 p-2 bg-blue-500 text-white">Toggle Role</button> */} {/* Test button */}
      <ThanhTieuDe onSidebarToggle={handleSidebarToggle} sidebarOpen={sidebarOpen} userName={userName} />
      <div className="flex flex-1">
        {/* Sidebar for desktop */}
        <div className="hidden md:block">
          <ThanhBen userRole={currentUserRole} />
        </div>
        {/* Sidebar overlay for mobile, appears below header */}
        {/* Container for mobile sidebar and backdrop, always in DOM for transitions */}
        <div className={`fixed top-12 left-0 right-0 bottom-0 z-40 flex md:hidden ${sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {/* Backdrop: fades in/out */}
          <div
            className={`fixed inset-0 bg-black transition-opacity duration-300 ease-out ${sidebarOpen ? 'bg-opacity-30' : 'bg-opacity-0'}`}
            style={{ top: 48 }} // Ensures backdrop starts below the header
            onClick={handleSidebarClose}
          ></div>
          {/* Sidebar: slides in/out */}
          <div
            className={`relative z-50 w-64 bg-white h-full shadow-lg transition-transform duration-300 ease-out transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <ThanhBen userRole={currentUserRole} />
          </div>
        </div>
        <main className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto mt-1 bg-white">
          <div className="flex-1 flex flex-col p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TrangChu;
