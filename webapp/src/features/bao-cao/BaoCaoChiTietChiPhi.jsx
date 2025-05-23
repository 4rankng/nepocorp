import React, { useState, useEffect, useMemo } from 'react';
import { getDetailedCostReport } from '../../services/mockData';

// Helper to format currency
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A'; // Handle NaN or non-number inputs
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format month (YYYY-MM to MM/YYYY)
const formatMonthForDisplay = monthYear => {
  if (!monthYear || !monthYear.includes('-')) return monthYear;
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
};

/*
Ideal data for a mobile card chart (e.g., for a stacked bar or donut):
const singleCardChartData = {
  totalCost: 2800000, // Total for the specific vehicle/month
  costBreakdown: [ // Array of cost items for that vehicle/month
    { category: 'Chi phí dầu', amount: 2000000 },
    { category: 'Phí cầu đường', amount: 500000 },
    { category: 'Bảo trì', amount: 300000 }
    // ... other categories for this specific card
  ]
};

// For a library like Chart.js, this would typically be transformed into:
// const chartJsData = {
//   labels: ['Chi phí dầu', 'Phí cầu đường', 'Bảo trì'],
//   datasets: [{
//     data: [2000000, 500000, 300000],
//     backgroundColor: [
//       'rgba(255, 99, 132, 0.7)', // Color for 'Chi phí dầu'
//       'rgba(54, 162, 235, 0.7)', // Color for 'Phí cầu đường'
//       'rgba(255, 206, 86, 0.7)'  // Color for 'Bảo trì'
//     ],
//     borderColor: [ /* ... border colors ... */ ],
//     borderWidth: 1
//   }]
// };
// For a stacked bar chart, if you want to show ONE bar per vehicle/month,
// the library would usually take one dataset where each data point is an object
// or an array representing the segments, or multiple datasets that stack.
// Example for one vehicle/month bar:
// datasets: [
//    { label: 'Chi phí dầu', data: [2000000], backgroundColor: 'red' },
//    { label: 'Phí cầu đường', data: [500000], backgroundColor: 'blue' },
//    { label: 'Bảo trì', data: [300000], backgroundColor: 'green' }
// ]
// and then configured to be stacked.
*/


const BaoCaoChiTietChiPhi = () => {
  const [detailedCostData, setDetailedCostData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Define a color palette for chart segments
  const segmentColors = [
    'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-lime-500', 'bg-orange-500'
  ];

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
      // Ensure categories are sorted by amount descending for consistent color mapping if needed
      acc[bienSoXe][monthYear].categories.push({ category, amount });
      acc[bienSoXe][monthYear].totalMonthCost += amount;
      return acc;
    }, {});
  }, [detailedCostData]);

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen"> {/* Ensure white background */}
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">Báo Cáo Chi Tiết Chi Phí</h1>

      {isLoading && <div className="text-center text-gray-500 py-10">Đang tải dữ liệu...</div>}
      {!isLoading && error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}

      {!isLoading && !error && detailedCostData.length === 0 && (
        <div className="text-center text-gray-500 mt-10 py-10">Không có dữ liệu chi phí để hiển thị.</div>
      )}

      {/* Desktop Table View */}
      {!isLoading && !error && detailedCostData.length > 0 && (
        <div className="hidden md:block bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatMonthForDisplay(item.monthYear)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{item.bienSoXe}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View with Stacked Bar Chart Simulation */}
      {!isLoading && !error && Object.keys(groupedDataForMobile).length > 0 && (
        <div className="block md:hidden space-y-4">
          {Object.entries(groupedDataForMobile).map(([bienSoXe, monthsData]) => (
            <div key={bienSoXe} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Xe: {bienSoXe}</h2>
              {Object.entries(monthsData).map(([monthYear, data]) => {
                 // Sort categories by amount descending for consistent stacking order if desired
                 const sortedCategories = [...data.categories].sort((a, b) => b.amount - a.amount);
                return (
                  <div key={monthYear} className="mb-4 last:mb-0 border-t pt-3 mt-3 first:mt-0 first:border-t-0">
                    <h3 className="text-md font-medium text-gray-600 mb-3">Tháng: {formatMonthForDisplay(monthYear)}</h3>
                    {/* Stacked Bar Container */}
                    <div className="w-full bg-gray-200 rounded-full h-6 flex overflow-hidden border border-gray-300 mb-2">
                      {sortedCategories.map((cat, catIndex) => (
                        <div
                          key={catIndex}
                          className={`${segmentColors[catIndex % segmentColors.length]}`}
                          style={{ width: `${data.totalMonthCost > 0 ? (cat.amount / data.totalMonthCost) * 100 : 0}%` }}
                          title={`${cat.category}: ${formatCurrency(cat.amount)} (${(data.totalMonthCost > 0 ? (cat.amount / data.totalMonthCost) * 100 : 0).toFixed(1)}%)`}
                        >
                           {/* Text inside segment if it's wide enough */}
                        </div>
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {sortedCategories.map((cat, catIndex) => (
                        <div key={catIndex} className="flex items-center gap-1">
                          <span className={`inline-block w-3 h-3 rounded ${segmentColors[catIndex % segmentColors.length]}`}></span>
                          <span className="text-gray-600">{cat.category}</span>
                          <span className="font-medium text-gray-700">{formatCurrency(cat.amount)}</span>
                          <span className="text-gray-400">({(data.totalMonthCost > 0 ? (cat.amount / data.totalMonthCost) * 100 : 0).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right text-sm font-semibold text-gray-700">
                      Tổng chi phí: {formatCurrency(data.totalMonthCost)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BaoCaoChiTietChiPhi;
