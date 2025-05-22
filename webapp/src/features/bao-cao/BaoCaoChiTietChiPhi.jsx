import React, { useState } from 'react';
import { mockVehicles, mockCosts } from '@services/mockData';

const BaoCaoChiTietChiPhi = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedVehicle, setSelectedVehicle] = useState('all');

  const months = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Group costs by type
  const groupedCosts = mockCosts.reduce((acc, cost) => {
    if (!acc[cost.type]) {
      acc[cost.type] = [];
    }
    acc[cost.type].push(cost);
    return acc;
  }, {});

  // Calculate total for each cost type
  const costTotals = Object.entries(groupedCosts).map(([type, costs]) => ({
    type,
    total: costs.reduce((sum, cost) => sum + cost.amount, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Báo cáo chi tiết chi phí</h2>
        <div className="flex space-x-4">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">Tất cả phương tiện</option>
            {mockVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.licensePlate}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại chi phí
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng chi phí
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi tiết
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costTotals.map((cost) => (
                <tr key={cost.type}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {cost.type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatCurrency(cost.total)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {costTotals.map((cost) => (
          <div key={cost.type} className="bg-white p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-gray-900">{cost.type}</h3>
              <span className="text-sm text-gray-500">
                {formatCurrency(cost.total)}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-blue-600 rounded-full"
                style={{
                  width: `${(cost.total / Math.max(...costTotals.map(c => c.total))) * 100}%`,
                }}
              />
            </div>
            <button
              type="button"
              className="mt-2 text-sm text-blue-600 hover:text-blue-900"
            >
              Xem chi tiết
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Xuất Excel
        </button>
      </div>
    </div>
  );
};

export default BaoCaoChiTietChiPhi;
