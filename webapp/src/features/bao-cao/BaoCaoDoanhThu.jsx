import React, { useState } from 'react';
import { mockData } from '@/services/mockData';

const BaoCaoDoanhThu = () => {
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Get unique vehicles from mock data
  const vehicles = [...new Set(mockData.financialReport.map(item => item.vehicle))];

  // Get unique months from mock data
  const months = [...new Set(mockData.financialReport.map(item => item.month))];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4">
        <select
          value={selectedVehicle}
          onChange={e => setSelectedVehicle(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Chọn biển số xe</option>
          {vehicles.map(vehicle => (
            <option key={vehicle} value={vehicle}>
              {vehicle}
            </option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Chọn tháng</option>
          {months.map(month => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500">Tổng chi phí</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">15,000,000 VNĐ</p>
        </div>
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500">Tổng cước vận chuyển</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">25,000,000 VNĐ</p>
        </div>
        <div className="bg-white p-4">
          <h3 className="text-sm font-medium text-gray-500">Tổng lợi nhuận</h3>
          <p className="mt-2 text-2xl font-semibold text-green-600">10,000,000 VNĐ</p>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
              >
                Ngày tháng
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Diễn giải
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Số container
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Tuyến đường
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Dầu (lít)
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Dầu (đồng)
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Đi đường
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Tổng chi phí
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Cước vận chuyển
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Lợi nhuận
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                28/05/2025
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                Chở hàng điện tử
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">CONT1234</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                Cảng Cát Lái - KCN Sóng Thần
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">40</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">1,000,000</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">500,000</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">1,700,000</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">3,000,000</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-green-600">1,300,000</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Other Costs */}
      <div className="mt-6">
        <h3 className="text-lg font-medium text-gray-900">Chi phí khác trong tháng</h3>
        <div className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Phí gửi xe</span>
            <span className="text-sm font-medium text-gray-900">500,000 VNĐ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Tiền Epass</span>
            <span className="text-sm font-medium text-gray-900">300,000 VNĐ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Lương lái xe</span>
            <span className="text-sm font-medium text-gray-900">8,000,000 VNĐ</span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="fixed bottom-6 right-6">
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

export default BaoCaoDoanhThu;
