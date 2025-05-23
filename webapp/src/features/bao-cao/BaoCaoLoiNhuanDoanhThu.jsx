import React, { useState, useEffect } from 'react';
import { getMonthlyProfitAndRevenueReport } from '../../services/mockData';

// Helper to format currency
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format month (YYYY-MM to MM/YYYY)
const formatMonthForDisplay = (monthYear) => {
  if (!monthYear || !monthYear.includes('-')) return monthYear;
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
};

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
      // Determine the maximum value for chart scaling (e.g., max revenue)
      if (data.length > 0) {
        const maxVal = data.reduce((max, item) => Math.max(max, item.revenue), 0);
        setMaxChartValue(maxVal > 0 ? maxVal : 1); // Avoid division by zero if all values are 0
      } else {
        setMaxChartValue(1); // Default if no data
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
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 text-center">Báo Cáo Lợi Nhuận & Doanh Thu</h1>

      {isLoading && <div className="text-center text-gray-500">Đang tải dữ liệu...</div>}
      {!isLoading && error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
      
      {!isLoading && !error && reportData.length === 0 && (
        <div className="text-center text-gray-500 mt-10">Không có dữ liệu để hiển thị.</div>
      )}

      {!isLoading && !error && reportData.length > 0 && (
        <div className="space-y-8">
          {reportData.map((item, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold text-gray-700 mb-1">
                Xe: {item.bienSoXe}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Tháng: {formatMonthForDisplay(item.monthYear)}
              </p>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-green-600">Doanh thu:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(item.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-green-500 h-6 rounded-full text-xs font-medium text-white text-center p-0.5 leading-none"
                      style={{ width: `${(item.revenue / maxChartValue) * 100}%` }}
                      title={`Doanh thu: ${formatCurrency(item.revenue)}`}
                    >
                      {/* Optional: text inside bar if space allows */}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-blue-600">Lợi nhuận:</span>
                    <span className={`font-semibold ${item.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className={`${item.profit >= 0 ? 'bg-blue-500' : 'bg-red-500'} h-6 rounded-full text-xs font-medium text-white text-center p-0.5 leading-none`}
                      style={{ width: `${(Math.abs(item.profit) / maxChartValue) * 100}%` }} // Use Math.abs for width if profit can be negative
                      title={`Lợi nhuận: ${formatCurrency(item.profit)}`}
                    >
                       {/* Optional: text inside bar */}
                    </div>
                  </div>
                </div>
                 <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-orange-600">Chi phí:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(item.totalCost)}</span>
                  </div>
                   <div className="w-full bg-gray-200 rounded-full h-6">
                    <div
                      className="bg-orange-500 h-6 rounded-full text-xs font-medium text-white text-center p-0.5 leading-none"
                      style={{ width: `${(item.totalCost / maxChartValue) * 100}%` }}
                      title={`Chi phí: ${formatCurrency(item.totalCost)}`}
                    >
                       {/* Optional: text inside bar */}
                    </div>
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
