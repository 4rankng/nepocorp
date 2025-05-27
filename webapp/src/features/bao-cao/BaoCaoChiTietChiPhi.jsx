import React, { useState, useEffect, useMemo } from 'react';
import { getDetailedCostReport } from '@services/mockData/reports';
import DateRangeFilter from '@components/DateRangeFilter';
import StandardTable from '@/components/StandardTable';
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

const formatMillion = value => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return (value / 1_000_000).toFixed(2);
};

const BaoCaoChiTietChiPhi = () => {
  const [originalData, setOriginalData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Table columns configuration
  const columns = [
    {
      key: 'monthYear',
      label: 'Tháng',
      align: 'left',
      render: value => {
        if (!value || !value.includes('/')) return value;
        const [month, year] = value.split('/');
        return `${month}/${year.slice(-2)}`;
      },
    },
    {
      key: 'bienSoXe',
      label: 'Biển Số Xe',
      align: 'left',
    },
    {
      key: 'category',
      label: 'Hạng Mục Chi Phí',
      align: 'left',
    },
    {
      key: 'amount',
      label: 'Số Tiền',
      align: 'right',
      numeric: true,
      render: value => formatMillion(value),
    },
  ];

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

  // Sort data from earliest to latest
  const sortedData = [...filteredData].sort((a, b) => a.monthYear.localeCompare(b.monthYear));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Báo Cáo Chi Tiết Chi Phí</h1>

      <DateRangeFilter onFilterChange={handleFilterChange} />

      {isLoading && <div className="text-center py-4">Đang tải dữ liệu...</div>}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}

      <StandardTable
        columns={columns}
        data={sortedData}
        loading={isLoading}
        error={error}
        emptyMessage="Không có dữ liệu cho khoảng thời gian đã chọn"
      />

      {!isLoading && !error && sortedData.length > 0 && (
        <div className="text-xs text-gray-500 mt-2 px-2">Đơn vị: triệu đồng</div>
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
