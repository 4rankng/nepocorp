import React, { useState } from 'react';
import { mockData } from '@/services/mockData';

const BaoCaoChiPhi = () => {
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

      {/* Cost Details Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th
                scope="col"
                className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0"
              >
                Hạng mục
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Số tiền
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Ghi chú
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                Chi phí dầu
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">1,000,000 VNĐ</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">40 lít</td>
            </tr>
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                Chi phí đi đường
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">500,000 VNĐ</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">150 km</td>
            </tr>
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                Chi phí khác
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">200,000 VNĐ</td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">Phí cầu đường</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BaoCaoChiPhi;
