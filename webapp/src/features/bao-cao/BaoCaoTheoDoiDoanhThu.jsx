import React, { useState } from 'react';
import { mockVehicles, mockCosts } from '@services/mockData';

const BaoCaoTheoDoiDoanhThu = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedVehicle, setSelectedVehicle] = useState('all');

  const months = [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Mock data for demonstration
  const mockTransportData = [
    {
      date: '2024-03-01',
      description: 'Vận chuyển hàng từ HCM đến HN',
      containerCount: 2,
      route: 'HCM - HN',
      fuelLiters: 150,
      fuelPrice: 25000,
      roadCost: 500000,
      totalCost: 4250000,
      transportFee: 8000000,
      profit: 3750000,
    },
    // Add more mock data as needed
  ];

  // Calculate summary
  const summary = {
    totalCost: mockTransportData.reduce((sum, item) => sum + item.totalCost, 0),
    totalTransportFee: mockTransportData.reduce((sum, item) => sum + item.transportFee, 0),
    totalProfit: mockTransportData.reduce((sum, item) => sum + item.profit, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Theo dõi doanh thu/chi phí</h2>
        <div className="flex space-x-4">
          <select
            value={selectedVehicle}
            onChange={e => setSelectedVehicle(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">Tất cả phương tiện</option>
            {mockVehicles.map(vehicle => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.licensePlate}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
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
            onChange={e => setSelectedYear(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500">Tổng chi phí</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalCost)}
          </p>
        </div>
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500">Tổng cước vận chuyển</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalTransportFee)}
          </p>
        </div>
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500">Tổng lợi nhuận</h3>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatCurrency(summary.totalProfit)}
          </p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày tháng
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Diễn giải
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số container
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tuyến đường
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dầu (lít)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dầu (đồng)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đi đường
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tổng chi phí
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cước vận chuyển
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lợi nhuận
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mockTransportData.map((item, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {new Date(item.date).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.containerCount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.route}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.fuelLiters}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(item.fuelPrice)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(item.roadCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(item.totalCost)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(item.transportFee)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(item.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

export default BaoCaoTheoDoiDoanhThu;
