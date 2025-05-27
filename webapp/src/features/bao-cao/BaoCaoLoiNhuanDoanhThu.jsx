import React, { useState, useEffect } from 'react';
import { fetchMonthlyProfitAndRevenueReport } from '@services/mockApi';
import DateRangeFilter from '@components/DateRangeFilter';
import StandardTable from '@/components/StandardTable';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const formatCurrency = value => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatMillion = value => {
  if (typeof value !== 'number') return 'N/A';
  return (value / 1_000_000).toFixed(2);
};

const BaoCaoLoiNhuanDoanhThu = () => {
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
        if (!value) return '-';
        if (typeof value === 'string' && value.includes('/')) {
          const [month, year] = value.split('/');
          return `${month}/${year.slice(-2)}`;
        }
        return value;
      },
    },
    {
      key: 'revenue',
      label: 'Doanh Thu',
      align: 'right',
      numeric: true,
      render: value => formatMillion(value),
    },
    {
      key: 'profit',
      label: 'Lợi Nhuận',
      align: 'right',
      numeric: true,
      render: value => formatMillion(value),
    },
    {
      key: 'profitMargin',
      label: 'Tỷ Suất Lợi Nhuận',
      align: 'right',
      numeric: true,
      render: (value, row) => ((row.profit / row.revenue) * 100).toFixed(2) + '%',
    },
  ];

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchMonthlyProfitAndRevenueReport();
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

  // Sort data from earliest to latest
  const sortedData = [...filteredData].sort((a, b) => a.monthYear.localeCompare(b.monthYear));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Báo Cáo Lợi Nhuận và Doanh Thu</h1>

      <DateRangeFilter onFilterChange={handleFilterChange} />

      {isLoading && <div className="text-center py-4">Đang tải dữ liệu...</div>}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}

      {!isLoading && !error && filteredData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={sortedData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="monthYear"
                  tickFormatter={label => {
                    if (!label) return '-';
                    if (typeof label === 'string' && label.includes('/')) {
                      const [month, year] = label.split('/');
                      return `${month}/${year.slice(-2)}`;
                    }
                    return label;
                  }}
                  interval={0}
                  tick={({ x, y, payload, index }) =>
                    index % 2 === 0 ? (
                      <text x={x} y={y + 10} textAnchor="middle" fontSize={12} fill="#555">
                        {(() => {
                          if (!payload.value) return '-';
                          if (typeof payload.value === 'string' && payload.value.includes('/')) {
                            const [month, year] = payload.value.split('/');
                            return `${month}/${year.slice(-2)}`;
                          }
                          return payload.value;
                        })()}
                      </text>
                    ) : null
                  }
                />
                <YAxis
                  tickFormatter={formatMillion}
                  tick={({ x, y, payload }) => (
                    <text x={x} y={y + 4} textAnchor="end" fontSize={12} fill="#555">
                      {formatMillion(payload.value)}
                    </text>
                  )}
                />
                <Tooltip
                  formatter={value => `${formatMillion(value)} triệu`}
                  labelFormatter={label => `Tháng ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh Thu"
                  stroke="#4F46E5"
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="Lợi Nhuận"
                  stroke="#10B981"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-xs text-gray-500 mt-2">Đơn vị: triệu đồng</div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Chi tiết theo tháng</h2>
            <StandardTable
              columns={columns}
              data={sortedData}
              loading={isLoading}
              error={null}
              emptyMessage="Không có dữ liệu cho khoảng thời gian đã chọn"
            />
            <div className="text-xs text-gray-500 mt-2 px-2">Đơn vị: triệu đồng</div>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredData.length === 0 && (
        <div className="text-center text-gray-500 bg-white p-8 rounded-lg shadow">
          Không có dữ liệu cho khoảng thời gian đã chọn
        </div>
      )}
    </div>
  );
};

export default BaoCaoLoiNhuanDoanhThu;
