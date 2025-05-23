import React, { useState, useEffect } from 'react';
import { getMonthlyProfitAndRevenueReport } from '../../services/mockData';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from 'recharts';

// Helper to format currency
const formatCurrency = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format month (YYYY-MM to MM/YYYY)
const formatMonthForDisplay = monthYear => {
  if (!monthYear || !monthYear.includes('-')) return monthYear;
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BaoCaoLoiNhuanDoanhThu = () => {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMonthlyProfitAndRevenueReport();
      // Sort data by month for chronological display
      const sortedData = [...data].sort((a, b) => a.monthYear.localeCompare(b.monthYear));
      setReportData(sortedData);
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

  // Prepare data for the chart
  const chartData = reportData.map(item => ({
    name: `${item.bienSoXe} (${formatMonthForDisplay(item.monthYear)})`,
    revenue: item.revenue,
    profit: item.profit,
    cost: item.totalCost
  }));

  return (
    <div className="p-4 md:p-6 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">
        Báo Cáo Lợi Nhuận & Doanh Thu
      </h1>

      {isLoading && (
        <div className="text-center text-gray-500 py-5">Đang tải dữ liệu...</div>
      )}

      {!isLoading && error && (
        <div className="text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>
      )}

      {!isLoading && !error && reportData.length === 0 && (
        <div className="text-center text-gray-500 mt-10 py-5">
          Không có dữ liệu để hiển thị.
        </div>
      )}

      {!isLoading && !error && reportData.length > 0 && (
        <div className="space-y-6">
          {/* Chart Container */}
          <div className="bg-white p-4 shadow-md rounded-lg border border-gray-200">
            <div className="h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrency(value)}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="cost"
                    name="Chi phí"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Lợi nhuận"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 shadow-md rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Tổng doanh thu</h3>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">
                {formatCurrency(reportData.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
            </div>
            <div className="bg-white p-4 shadow-md rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Tổng chi phí</h3>
              <p className="mt-2 text-2xl font-semibold text-amber-600">
                {formatCurrency(reportData.reduce((sum, item) => sum + item.totalCost, 0))}
              </p>
            </div>
            <div className="bg-white p-4 shadow-md rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500">Tổng lợi nhuận</h3>
              <p className="mt-2 text-2xl font-semibold text-blue-600">
                {formatCurrency(reportData.reduce((sum, item) => sum + item.profit, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaoCaoLoiNhuanDoanhThu;
