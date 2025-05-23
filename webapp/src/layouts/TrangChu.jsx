import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import ThanhTieuDe from '../shared/components/ThanhTieuDe';
import ThanhBen from '../shared/components/ThanhBen';

const TrangChu = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSidebarToggle = () => setSidebarOpen((open) => !open);
  const handleSidebarClose = () => setSidebarOpen(false);

  return (
    <div className="flex flex-col h-screen">
      <ThanhTieuDe onSidebarToggle={handleSidebarToggle} />
      <div className="flex flex-1">
        {/* Sidebar for desktop */}
        <div className="hidden md:block">
          <ThanhBen />
        </div>
        {/* Sidebar overlay for mobile, appears below header */}
        {sidebarOpen && (
          <div className="fixed top-12 left-0 right-0 bottom-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-30" style={{ top: 48 }} onClick={handleSidebarClose}></div>
            <div className="relative z-50 w-64 bg-white h-full shadow-lg">
              <ThanhBen />
            </div>
          </div>
        )}
        <main className="flex-1 flex flex-col overflow-x-hidden overflow-y-auto bg-white pt-12 md:ml-64">
          <div className="flex-1 flex flex-col p-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default TrangChu;
