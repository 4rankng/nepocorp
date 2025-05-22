import React from 'react';
import { Outlet } from 'react-router-dom';

const TrangXacThuc = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <Outlet />
      </div>
    </div>
  );
};

export default TrangXacThuc;
