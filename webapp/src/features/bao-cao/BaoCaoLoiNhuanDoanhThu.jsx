import React, { useState, useEffect } from 'react';
import { getMonthlyProfitAndRevenueReport } from '../../services/mockData';

// Helper to format currency
<<<<<<< HEAD
const formatCurrency = value => {
=======
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A'; // Handle NaN or non-number inputs
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format month (YYYY-MM to MM/YYYY)
const formatMonthForDisplay = monthYear => {
  if (!monthYear || !monthYear.includes('-')) return monthYear;
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
};

/*
Ideal data structure for a grouped horizontal bar chart (e.g., for Chart.js or Recharts):
const chartData = {
  labels: ['Xe 51C-12345 / 01-2024', 'Xe 51C-12345 / 02-2024', ...], // Combined vehicle and month
  datasets: [
    {
      label: 'Doanh thu (VNĐ)',
      data: [5000000, 6000000, ...], // Revenue data for each label
      backgroundColor: 'rgba(75, 192, 192, 0.7)', // Example: Teal
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    },
    {
      label: 'Lợi nhuận (VNĐ)',
      data: [1000000, 1200000, ...], // Profit data for each label
      backgroundColor: 'rgba(54, 162, 235, 0.7)', // Example: Blue
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
      // Note: For negative profit, some libraries allow specific bar colors
      // or you might need to process data to have a separate dataset for losses if styled differently.
    }
  ]
};

This structure is suitable for libraries that can render grouped bars, where each item in `labels`
corresponds to a group, and each dataset contributes a bar to that group.
*/

const BaoCaoLoiNhuanDoanhThu = () => {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxChartValue, setMaxChartValue] = useState(0);

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMonthlyProfitAndRevenueReport();
      setReportData(data);
      if (data.length > 0) {
        // Scale based on the highest absolute value (revenue or cost) for better visual balance
        const maxRevenue = data.reduce((max, item) => Math.max(max, item.revenue), 0);
        const maxCost = data.reduce((max,item) => Math.max(max, item.totalCost), 0);
        setMaxChartValue(Math.max(maxRevenue, maxCost, 1)); // Use Math.max(..., 1) to avoid 0
      } else {
        setMaxChartValue(1); 
      }
    } catch (err) {
      setError('Không thể tải dữ liệu báo cáo.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  return (
<<<<<<< HEAD
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">
        Báo Cáo Lợi Nhuận & Doanh Thu
      </h1>

      {isLoading && <div className="text-center text-gray-500">Đang tải dữ liệu...</div>}
      {!isLoading && error && (
        <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>
      )}

=======
    <div className="p-4 md:p-6 min-h-screen"> {/* Removed bg-gray-100 */}
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">Báo Cáo Lợi Nhuận & Doanh Thu</h1>

      {isLoading && <div className="text-center text-gray-500 py-5">Đang tải dữ liệu...</div>}
      {!isLoading && error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
      
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
      {!isLoading && !error && reportData.length === 0 && (
        <div className="text-center text-gray-500 mt-10 py-5">Không có dữ liệu để hiển thị.</div>
      )}

      {!isLoading && !error && reportData.length > 0 && (
        <div className="space-y-6">
          {reportData.map((item, index) => (
<<<<<<< HEAD
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-1">Xe: {item.bienSoXe}</h2>
              <p className="text-sm text-gray-500 mb-4">
=======
            <div key={index} className="bg-white p-4 shadow-md rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-1">
                Xe: {item.bienSoXe}
              </h2>
              <p className="text-xs text-gray-500 mb-3">
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
                Tháng: {formatMonthForDisplay(item.monthYear)}
              </p>

              <div className="space-y-2.5">
                {/* Revenue Bar */}
                <div>
<<<<<<< HEAD
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-green-600">Doanh thu:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(item.revenue)}
                    </span>
=======
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium text-green-700">Doanh thu:</span>
                    <span className="font-semibold text-green-700">{formatCurrency(item.revenue)}</span>
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-5 border border-gray-300">
                    <div
                      className="bg-green-500 h-full rounded-full"
                      style={{ width: `${maxChartValue > 0 ? (item.revenue / maxChartValue) * 100 : 0}%` }}
                      title={`Doanh thu: ${formatCurrency(item.revenue)}`}
                    ></div>
                  </div>
                </div>

                {/* Profit Bar */}
                <div>
<<<<<<< HEAD
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-blue-600">Lợi nhuận:</span>
                    <span
                      className={`font-semibold ${item.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}
                    >
=======
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium ${item.profit >= 0 ? 'text-sky-700' : 'text-red-700'}">Lợi nhuận:</span>
                    <span className={`font-semibold ${item.profit >= 0 ? 'text-sky-700' : 'text-red-700'}`}>
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-5 border border-gray-300">
                    <div
                      className={`${item.profit >= 0 ? 'bg-sky-500' : 'bg-red-500'} h-full rounded-full`}
                      style={{ width: `${maxChartValue > 0 ? (Math.abs(item.profit) / maxChartValue) * 100 : 0}%` }}
                      title={`Lợi nhuận: ${formatCurrency(item.profit)}`}
<<<<<<< HEAD
                    >
                      {/* Optional: text inside bar */}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-orange-600">Chi phí:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(item.totalCost)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
=======
                    ></div>
                  </div>
                </div>

                {/* Cost Bar */}
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="font-medium text-amber-700">Chi phí:</span>
                    <span className="font-semibold text-amber-700">{formatCurrency(item.totalCost)}</span>
                  </div>
                   <div className="w-full bg-gray-200 rounded-full h-5 border border-gray-300">
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${maxChartValue > 0 ? (item.totalCost / maxChartValue) * 100 : 0}%` }}
                      title={`Chi phí: ${formatCurrency(item.totalCost)}`}
<<<<<<< HEAD
                    >
                      {/* Optional: text inside bar */}
                    </div>
=======
                    ></div>
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BaoCaoLoiNhuanDoanhThu;
