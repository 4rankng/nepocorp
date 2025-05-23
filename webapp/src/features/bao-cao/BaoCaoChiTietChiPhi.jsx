import React, { useState, useEffect, useMemo } from 'react';
import { getDetailedCostReport } from '../../services/mockData';
import DateRangeFilter from '../../components/DateRangeFilter';
import { format } from 'date-fns';

// Helper to format currency
const formatCurrency = value => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A'; // Handle NaN or non-number inputs
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format month (YYYY-MM to MM/YYYY)
const formatMonthForDisplay = monthYear => {
  if (!monthYear || !monthYear.includes('-')) return monthYear;
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
};

const BaoCaoChiTietChiPhi = () => {
  const [originalData, setOriginalData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Define a color palette for chart segments
  const segmentColors = [
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-lime-500',
    'bg-orange-500',
  ];

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getDetailedCostReport();
      setOriginalData(data);
      setFilteredData(data);
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

  const handleFilterChange = filterData => {
    if (filterData.type === 'month') {
      const monthStr = format(filterData.date, 'MM/yyyy');
      const filtered = originalData.filter(item => item.monthYear === monthStr);
      setFilteredData(filtered);
    } else {
      const filtered = originalData.filter(item => {
        const [month, year] = item.monthYear.split('/');
        const itemDate = new Date(parseInt(year), parseInt(month) - 1);
        return itemDate >= filterData.startDate && itemDate <= filterData.endDate;
      });
      setFilteredData(filtered);
    }
  };

  const groupedDataForMobile = useMemo(() => {
    if (!filteredData) return {};

    return filteredData.reduce((acc, item) => {
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
  }, [filteredData]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Báo Cáo Chi Tiết Chi Phí</h1>

      <DateRangeFilter onFilterChange={handleFilterChange} />

      {isLoading && <div className="text-center py-4">Đang tải dữ liệu...</div>}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}

      {!isLoading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tháng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Biển Số Xe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hạng Mục Chi Phí
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Số Tiền
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.monthYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.bienSoXe}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile Card View with Stacked Bar Chart Simulation */}
      {!isLoading && !error && Object.keys(groupedDataForMobile || {}).length > 0 && (
        <div className="block md:hidden space-y-4">
          {Object.entries(groupedDataForMobile || {}).map(([bienSoXe, monthsData]) => (
            <div
              key={bienSoXe}
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
            >
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Xe: {bienSoXe}</h2>
              {Object.entries(monthsData || {}).map(([monthYear, data]) => {
                // Sort categories by amount descending for consistent stacking order if desired
                const sortedCategories = [...(data.categories || [])].sort(
                  (a, b) => b.amount - a.amount
                );
                return (
                  <div
                    key={monthYear}
                    className="mb-4 last:mb-0 border-t pt-3 mt-3 first:mt-0 first:border-t-0"
                  >
                    <h3 className="text-md font-medium text-gray-600 mb-3">
                      Tháng: {formatMonthForDisplay(monthYear)}
                    </h3>
                    {/* Stacked Bar Container */}
                    <div className="w-full bg-gray-200 rounded-full h-6 flex overflow-hidden border border-gray-300 mb-2">
                      {sortedCategories.map((cat, catIndex) => (
                        <div
                          key={catIndex}
                          className={`${segmentColors[catIndex % segmentColors.length]}`}
                          style={{
                            width: `${data.totalMonthCost > 0 ? (cat.amount / data.totalMonthCost) * 100 : 0}%`,
                          }}
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
                          <span
                            className={`inline-block w-3 h-3 rounded ${segmentColors[catIndex % segmentColors.length]}`}
                          ></span>
                          <span className="text-gray-600">{cat.category}</span>
                          <span className="font-medium text-gray-700">
                            {formatCurrency(cat.amount)}
                          </span>
                          <span className="text-gray-400">
                            (
                            {(data.totalMonthCost > 0
                              ? (cat.amount / data.totalMonthCost) * 100
                              : 0
                            ).toFixed(1)}
                            %)
                          </span>
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
