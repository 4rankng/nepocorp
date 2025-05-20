import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const roles = [
  { key: 'manager', label: 'Quản lý', color: 'border-gray-200 bg-gray-50 text-gray-500', selected: 'bg-red-100 border-red-400 text-black' },
  { key: 'accountant', label: 'Kế toán', color: 'border-gray-200 bg-gray-50 text-gray-500', selected: 'bg-yellow-100 border-yellow-400 text-black' },
  { key: 'dispatcher', label: 'Thu Nhận', color: 'border-gray-200 bg-gray-50 text-gray-500', selected: 'bg-purple-100 border-purple-400 text-black' },
  { key: 'driver', label: 'Lái xe', color: 'border-gray-200 bg-gray-50 text-gray-500', selected: 'bg-green-100 border-green-400 text-black' },
];

export default function Dashboard() {
  const [selectedRole, setSelectedRole] = useState('');
  const navigate = useNavigate();

  const handleGo = () => {
    if (selectedRole) navigate(`/${selectedRole}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-2 sm:px-4">
      <div className="flex flex-col items-center w-full max-w-lg">
        <div className="flex flex-row gap-3 mb-8 w-full justify-center overflow-x-auto scrollbar-none whitespace-nowrap">
          {roles.map((role) => (
            <button
              key={role.key}
              onClick={() => setSelectedRole(role.key)}
              className={`px-6 py-2 rounded border font-normal text-[15px] leading-none focus:outline-none shadow-none whitespace-nowrap font-sfpro text-black transition-colors duration-200 ease-in-out
                ${role.color}
                ${selectedRole === role.key ? role.selected + ' font-semibold border-2' : 'hover:bg-gray-100 hover:border-gray-400'}
                `}
              style={{ minWidth: 110, fontFamily: 'SF Pro Text, SF Pro Display, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif' }}
            >
              {role.label}
            </button>
          ))}
        </div>
        <button
          className="w-full bg-blue-400 hover:bg-blue-500 text-white font-semibold text-[15px] leading-none py-3 rounded mt-2 transition-all duration-150 disabled:opacity-50 whitespace-nowrap font-sfpro"
          onClick={handleGo}
          disabled={!selectedRole}
          style={{ fontFamily: 'SF Pro Text, SF Pro Display, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif' }}
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
