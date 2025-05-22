import React, { useState } from 'react';
import { mockData } from '@/services/mockData';

const LichVanChuyen = () => {
  const [transportSchedules, setTransportSchedules] = useState(mockData.transportSchedule || []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Lịch vận chuyển</h2>
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Thêm mới
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                Ngày tháng
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Biển số xe
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Đối tác
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Diễn giải
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Tuyến đường
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Trạng thái
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Số km chuyển hàng
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Số km chuyển vỏ rỗng
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Chi phí dầu (lít)
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Đơn giá dầu
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Chi phí dầu (Đồng)
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Định mức đi đường
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                Chi phí khác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {transportSchedules.map((schedule) => (
              <tr key={schedule.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                  {schedule.date}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.vehicle}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.partner || '-'}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.description}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.route}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    schedule.status === 'Hoàn thành' ? 'bg-green-100 text-green-800' :
                    schedule.status === 'Đang chạy' ? 'bg-blue-100 text-blue-800' :
                    schedule.status === 'Lên lịch' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {schedule.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.loadedKm || 0}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.emptyKm || 0}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.fuelLiters || 0}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.fuelPrice?.toLocaleString('vi-VN') || 0} VNĐ
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.fuelCost?.toLocaleString('vi-VN') || 0} VNĐ
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.roadAllowance?.toLocaleString('vi-VN') || 0} VNĐ
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                  {schedule.otherCosts?.toLocaleString('vi-VN') || 0} VNĐ
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LichVanChuyen;
