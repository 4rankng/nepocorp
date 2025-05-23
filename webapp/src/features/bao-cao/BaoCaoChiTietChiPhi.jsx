import React, { useState, useEffect, useMemo } from 'react';
import { getDetailedCostReport } from '../../services/mockData';

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

const BaoCaoChiTietChiPhi = () => {
  const [detailedCostData, setDetailedCostData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDetailedCostData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getDetailedCostReport();
      setDetailedCostData(data);
    } catch (err) {
      setError('Không thể tải dữ liệu chi tiết chi phí.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetailedCostData();
  }, []);

  const groupedDataForMobile = useMemo(() => {
    if (!detailedCostData) return {};
    
    return detailedCostData.reduce((acc, item) => {
      const { bienSoXe, monthYear, category, amount } = item;
      
      if (!acc[bienSoXe]) {
        acc[bienSoXe] = {};
      }
      if (!acc[bienSoXe][monthYear]) {
        acc[bienSoXe][monthYear] = { totalMonthCost: 0, categories: [] };
      }
      
      acc[bienSoXe][monthYear].categories.push({ category, amount });
      acc[bienSoXe][monthYear].totalMonthCost += amount;
      
      return acc;
    }, {});
  }, [detailedCostData]);


  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">Báo Cáo Chi Tiết Chi Phí</h1>

      {isLoading && <div className="text-center text-gray-500">Đang tải dữ liệu...</div>}
      {!isLoading && error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
      
      {!isLoading && !error && detailedCostData.length === 0 && (
        <div className="text-center text-gray-500 mt-10">Không có dữ liệu chi phí để hiển thị.</div>
      )}

      {/* Desktop Table View */}
      {!isLoading && !error && detailedCostData.length > 0 && (
        <div className="hidden md:block bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tháng</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biển Số Xe</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạng Mục Chi Phí</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số Tiền</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {detailedCostData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatMonthForDisplay(item.monthYear)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.bienSoXe}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {!isLoading && !error && Object.keys(groupedDataForMobile).length > 0 && (
        <div className="block md:hidden space-y-6">
          {Object.entries(groupedDataForMobile).map(([bienSoXe, monthsData]) => (
            <div key={bienSoXe} className="bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Xe: {bienSoXe}</h2>
              {Object.entries(monthsData).map(([monthYear, data]) => (
                <div key={monthYear} className="mb-4 last:mb-0 border-t pt-2 mt-2 first:mt-0 first:border-t-0">
                  <h3 className="text-md font-medium text-gray-600 mb-2">Tháng: {formatMonthForDisplay(monthYear)}</h3>
                  <div className="space-y-2">
                    {data.categories.map((cat, catIndex) => (
                      <div key={catIndex}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600">{cat.category}</span>
                          <span className="font-medium text-gray-700">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 md:h-4">
                          <div
                            className="bg-blue-500 h-3 md:h-4 rounded-full"
                            style={{ width: `${data.totalMonthCost > 0 ? (cat.amount / data.totalMonthCost) * 100 : 0}%` }}
                            title={`${cat.category}: ${formatCurrency(cat.amount)}`}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                   <div className="text-right mt-2 text-sm font-semibold text-gray-800">
                        Tổng chi phí tháng: {formatCurrency(data.totalMonthCost)}
                   </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BaoCaoChiTietChiPhi;
