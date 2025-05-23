import React, { useState, useEffect, useMemo } from 'react';
import { getMonthlyProfitAndRevenueReport } from '../../services/mockData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Dot,
  ReferenceLine,
} from 'recharts';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  BriefcaseIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

// Helper to format currency
const formatCurrency = value => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format month (YYYY-MM to MM/YYYY)
const formatMonthForDisplay = monthYear => {
  if (!monthYear || !monthYear.includes('-')) return monthYear;
  const [year, month] = monthYear.split('-');
  return `${month}/${year}`;
};

// Helper to format currency in millions (triệu đồng)
const formatMillionVND = value => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  const million = value / 1_000_000;
  return million.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

// Enhanced custom tooltip with better styling and animations
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-xl rounded-lg border border-gray-200 z-50 transform transition-all duration-200 ease-in-out">
        <p className="font-semibold text-gray-800 mb-2 text-lg">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.stroke }} />
                <span className="text-sm font-medium text-gray-600">{entry.name}:</span>
              </div>
              <span className="text-sm font-semibold" style={{ color: entry.stroke }}>
                {formatMillionVND(entry.value)} triệu đồng
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// Custom Dot for all lines with animation
const CustomizedDot = props => {
  const { cx, cy, stroke, payload, value } = props;
  if (value === undefined || value === null) return null;

  return (
    <Dot
      cx={cx}
      cy={cy}
      r={6}
      stroke={stroke}
      strokeWidth={2}
      fill="#fff"
      className="transition-all duration-200 ease-in-out hover:r-8"
    />
  );
};

const BaoCaoLoiNhuanDoanhThu = () => {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('all'); // 'all', '3m', '6m', '1y'

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMonthlyProfitAndRevenueReport();
      const sortedData = [...data].sort((a, b) => a.monthYear.localeCompare(b.monthYear));
      setReportData(sortedData);
    } catch (err) {
      setError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại sau.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Filter data based on selected period
  const filteredData = useMemo(() => {
    if (!reportData.length) return [];

    const now = new Date();
    const periods = {
      '3m': new Date(now.setMonth(now.getMonth() - 3)),
      '6m': new Date(now.setMonth(now.getMonth() - 6)),
      '1y': new Date(now.setFullYear(now.getFullYear() - 1)),
    };

    if (selectedPeriod === 'all') return reportData;

    return reportData.filter(item => {
      const [year, month] = item.monthYear.split('-');
      const itemDate = new Date(year, month - 1);
      return itemDate >= periods[selectedPeriod];
    });
  }, [reportData, selectedPeriod]);

  // Aggregate data by month for the chart and KPIs
  const aggregatedData = useMemo(() => {
    if (!filteredData.length) return { chartData: [], totals: { revenue: 0, cost: 0, profit: 0 } };

    const monthlyAggregates = filteredData.reduce((acc, item) => {
      const month = formatMonthForDisplay(item.monthYear);
      if (!acc[month]) {
        acc[month] = { monthYearLabel: month, revenue: 0, profit: 0 };
      }
      acc[month].revenue += item.revenue || 0;
      acc[month].profit += item.profit || 0;
      return acc;
    }, {});

    // Calculate cost as revenue - profit
    Object.values(monthlyAggregates).forEach(m => {
      m.cost = m.revenue - m.profit;
    });

    const chartData = Object.values(monthlyAggregates).sort((a, b) => {
      const [aMonth, aYear] = a.monthYearLabel.split('/');
      const [bMonth, bYear] = b.monthYearLabel.split('/');
      return new Date(`${aYear}-${aMonth}-01`) - new Date(`${bYear}-${bMonth}-01`);
    });

    const totals = chartData.reduce(
      (acc, item) => {
        acc.revenue += item.revenue;
        acc.profit += item.profit;
        return acc;
      },
      { revenue: 0, profit: 0 }
    );
    totals.cost = totals.revenue - totals.profit;

    return { chartData, totals };
  }, [filteredData]);

  const { chartData, totals } = aggregatedData;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold mb-2">{error}</p>
          <button
            onClick={fetchReportData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 bg-white min-h-screen">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-2 md:mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 text-center md:text-left mb-2 md:mb-0">
          Báo Cáo Lợi Nhuận & Doanh Thu
        </h1>
        <div className="flex justify-center md:justify-end items-center gap-2">
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded shadow-sm">
            <CalendarIcon className="w-4 h-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-700 text-xs md:text-sm"
            >
              <option value="all">Tất cả</option>
              <option value="3m">3 tháng gần nhất</option>
              <option value="6m">6 tháng gần nhất</option>
              <option value="1y">1 năm gần nhất</option>
            </select>
          </div>
        </div>
      </header>

      {/* KPI Cards Row */}
      <div className="flex flex-row flex-wrap justify-center md:justify-start gap-2 md:gap-4 mb-2 md:mb-3">
        {/* Total Revenue Card */}
        <div className="bg-white px-3 py-2 shadow rounded-lg border border-gray-200 flex-1 min-w-[120px] max-w-[180px] flex flex-col items-center">
          <div className="flex items-center gap-1 mb-1">
            <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
            <span className="text-xs font-semibold text-gray-600">Tổng Doanh Thu</span>
          </div>
          <span className="text-lg md:text-xl font-bold text-green-600">
            {formatMillionVND(totals.revenue)} <span className="text-xs font-medium">triệu đồng</span>
          </span>
        </div>
        {/* Total Costs Card */}
        <div className="bg-white px-3 py-2 shadow rounded-lg border border-gray-200 flex-1 min-w-[120px] max-w-[180px] flex flex-col items-center">
          <div className="flex items-center gap-1 mb-1">
            <BriefcaseIcon className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-gray-600">Tổng Chi Phí</span>
          </div>
          <span className="text-lg md:text-xl font-bold text-amber-600">
            {formatMillionVND(totals.cost)} <span className="text-xs font-medium">triệu đồng</span>
          </span>
        </div>
        {/* Net Profit Card */}
        <div className="bg-white px-3 py-2 shadow rounded-lg border border-gray-200 flex-1 min-w-[120px] max-w-[180px] flex flex-col items-center">
          <div className="flex items-center gap-1 mb-1">
            <PresentationChartLineIcon className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold text-gray-600">Lợi Nhuận Ròng</span>
          </div>
          <span className={`text-lg md:text-xl font-bold ${totals.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatMillionVND(totals.profit)} <span className="text-xs font-medium">triệu đồng</span>
          </span>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-white px-2 py-2 md:px-4 md:py-3 rounded-lg shadow border border-gray-200">
        <div className="relative h-[220px] md:h-[260px]">
          {/* Chart Unit Note inside chart area */}
          <div className="absolute top-2 right-3 text-xs text-gray-500 z-10">Đơn vị: Triệu đồng</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="monthYearLabel"
                stroke="#6B7280"
                tick={{ fill: '#4B5563', fontSize: 10 }}
                tickLine={{ stroke: '#9CA3AF' }}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: '#4B5563', fontSize: 10 }}
                tickLine={{ stroke: '#9CA3AF' }}
                tickFormatter={value => formatMillionVND(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={24}
                wrapperStyle={{
                  paddingBottom: '4px',
                  fontSize: '11px',
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Doanh Thu"
                stroke="#10B981"
                strokeWidth={2}
                dot={<CustomizedDot />}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="Chi Phí"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={<CustomizedDot />}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Lợi Nhuận"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={<CustomizedDot />}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
              <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BaoCaoLoiNhuanDoanhThu;
