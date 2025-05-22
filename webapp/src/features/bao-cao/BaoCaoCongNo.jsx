import React, { useState } from 'react';

const BaoCaoCongNo = () => {
  const [selectedMonth, setSelectedMonth] = useState('');

  const months = [
    'Tháng 1 2025',
    'Tháng 2 2025',
    'Tháng 3 2025',
    'Tháng 4 2025',
    'Tháng 5 2025',
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex gap-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Chọn tháng</option>
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* Debt Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                Tên đơn vị
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Phải thu
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Phải trả
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Ghi chú
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                Công ty TNHH ABC
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                15,000,000 VNĐ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                0 VNĐ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                Đã thanh toán 50%
              </td>
            </tr>
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                Công ty XYZ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                0 VNĐ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                8,000,000 VNĐ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                Chưa thanh toán
              </td>
            </tr>
            <tr>
              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                Công ty DEF
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                12,000,000 VNĐ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                5,000,000 VNĐ
              </td>
              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                Đã thanh toán 30%
              </td>
            </tr>
          </tbody>
        </table>
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

export default BaoCaoCongNo;
