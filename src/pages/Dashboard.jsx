import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const roles = [
  { key: 'manager', label: 'Quản lý' },
  { key: 'accountant', label: 'Kế toán' },
  { key: 'dispatcher', label: 'Giao nhận' },
  { key: 'driver', label: 'Lái xe' },
];

export default function Dashboard() {
  const [role, setRole] = useState('');
  const navigate = useNavigate();

  const handleSelect = (e) => {
    setRole(e.target.value);
  };

  const handleGo = () => {
    if (role) navigate(`/${role}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow w-80">
        <h1 className="text-2xl font-bold mb-6 text-center">Chọn vai trò</h1>
        <select
          className="w-full border rounded p-2 mb-4"
          value={role}
          onChange={handleSelect}
        >
          <option value="">-- Chọn vai trò --</option>
          {roles.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <button
          className="w-full bg-blue-600 text-white rounded p-2 font-semibold disabled:opacity-50"
          onClick={handleGo}
          disabled={!role}
        >
          Vào hệ thống
        </button>
      </div>
    </div>
  );
}
