import React, { useState } from 'react';
import { mockData } from '@/services/mockData';

const BaoCaoLoiNhuan = () => {
  const [selectedMonth, setSelectedMonth] = useState('');

  // Get unique months from mock data
  const months = [...new Set(mockData.financialReport.map(item => item.month))];

  // Group data by month
  const dataByMonth = months.reduce((acc, month) => {
    acc[month] = mockData.financialReport.filter(item => item.month === month);
    return acc;
  }, {});

  // If a month is selected, only show that month
  const displayMonths = selectedMonth ? [selectedMonth] : months;

  // For each month, find the max revenue for scaling
  const maxRevenueByMonth = {};
  displayMonths.forEach(month => {
    maxRevenueByMonth[month] = Math.max(...(dataByMonth[month]?.map(item => item.revenue) || [1]));
  });

  // Calculate summary
  const summaryData = mockData.financialReport.filter(item =>
    selectedMonth ? item.month === selectedMonth : true
  );
  const totalRevenue = summaryData.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = summaryData.reduce((sum, item) => sum + item.profit, 0);

  return (
    <div className="min-h-full flex flex-col space-y-6">
      {/* Controls */}
      <div className="flex gap-4 items-center flex-wrap">
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:max-w-xs sm:text-sm sm:leading-6"
        >
          <option value="">Tất cả các tháng</option>
          {months.map(month => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
        {/* Legend */}
        <div className="flex items-center gap-4 ml-4">
          <span className="flex items-center">
            <span className="inline-block w-4 h-2 bg-blue-500 mr-1 rounded" /> Doanh thu
          </span>
          <span className="flex items-center">
            <span className="inline-block w-4 h-2 bg-green-500 mr-1 rounded" /> Lợi nhuận
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Tổng doanh thu</h3>
          <p className="mt-2 text-2xl font-semibold text-blue-600">
            {totalRevenue.toLocaleString('vi-VN')} VNĐ
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Tổng lợi nhuận</h3>
          <p className="mt-2 text-2xl font-semibold text-green-600">
            {totalProfit.toLocaleString('vi-VN')} VNĐ
          </p>
        </div>
      </div>

      {/* Revenue and Profit Chart by Month */}
      <div className="space-y-8 flex-1">
        {displayMonths.map(month => (
          <div key={month} className="bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900">{month}</h4>
              <span className="text-sm text-gray-500">
                Tổng doanh thu:{' '}
                {dataByMonth[month]
                  .reduce((sum, item) => sum + item.revenue, 0)
                  .toLocaleString('vi-VN')}{' '}
                VNĐ
              </span>
            </div>
            <div className="space-y-6">
              {dataByMonth[month].map(item => (
                <div key={item.vehicle} className="space-y-1">
                  {/* Revenue bar */}
                  <div className="flex items-center mb-1">
                    <div className="h-3 rounded bg-blue-200 w-full relative">
                      <div
                        className="h-3 rounded bg-blue-500 absolute top-0 left-0"
                        style={{ width: `${(item.revenue / maxRevenueByMonth[month]) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-blue-600 font-semibold">
                      {item.revenue.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  {/* Profit bar */}
                  <div className="flex items-center">
                    <div className="h-3 rounded bg-green-200 w-full relative">
                      <div
                        className="h-3 rounded bg-green-500 absolute top-0 left-0"
                        style={{ width: `${(item.profit / maxRevenueByMonth[month]) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-green-600 font-semibold">
                      {item.profit.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BaoCaoLoiNhuan;
