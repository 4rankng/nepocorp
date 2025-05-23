import React, { useState, useEffect, useMemo } from 'react';
import { getMonthlyProfitAndRevenueReport } from '../../services/mockData';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Dot,
} from 'recharts';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  BriefcaseIcon,
} from '@heroicons/react/24/outline'; // Example icons

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

// Custom tooltip component - remains largely the same, styling might be tweaked if needed
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 shadow-xl rounded-lg border border-gray-200 z-50">
        <p className="font-semibold text-gray-800 mb-2 text-lg">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.stroke || entry.fill }} className="text-sm my-1">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Dot for the Profit Line for better emphasis
const CustomizedProfitDot = props => {
  const { cx, cy, stroke, payload, value } = props;
  if (payload.profit === undefined || payload.profit === null) return null; // Don't render if no profit data

  return <Dot cx={cx} cy={cy} r={5} stroke={stroke} strokeWidth={2} fill="#fff" />;
};

const BaoCaoLoiNhuanDoanhThu = () => {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Placeholder for future date range selection
  // const [dateRange, setDateRange] = useState({ start: null, end: null });

  const fetchReportData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getMonthlyProfitAndRevenueReport();
      // Sort data by month for chronological display
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
  }, []); // Consider adding dateRange to dependency array if implemented

  // Aggregate data by month for the chart and KPIs
  const aggregatedData = useMemo(() => {
    if (!reportData.length) return { chartData: [], totals: { revenue: 0, cost: 0, profit: 0 } };

    const monthlyAggregates = reportData.reduce((acc, item) => {
      const month = formatMonthForDisplay(item.monthYear);
      if (!acc[month]) {
        acc[month] = { monthYearLabel: month, revenue: 0, cost: 0, profit: 0 };
      }
      acc[month].revenue += item.revenue || 0;
      acc[month].cost += item.totalCost || 0;
      acc[month].profit += item.profit || 0;
      return acc;
    }, {});

    const chartData = Object.values(monthlyAggregates).sort((a, b) => {
      const [aMonth, aYear] = a.monthYearLabel.split('/');
      const [bMonth, bYear] = b.monthYearLabel.split('/');
      return new Date(`${aYear}-${aMonth}-01`) - new Date(`${bYear}-${bMonth}-01`);
    });

    const totals = chartData.reduce(
      (acc, item) => {
        acc.revenue += item.revenue;
        acc.cost += item.cost;
        acc.profit += item.profit;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0 }
    );

    return { chartData, totals };
  }, [reportData]);

  const { chartData, totals } = aggregatedData;

  // Placeholder for % change calculation
  // const revenuePercentChange = '+5%';
  // const costPercentChange = '+2%';
  // const profitPercentChange = '+10%';

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <p className="text-xl text-gray-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <PresentationChartLineIcon className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-xl text-red-500 bg-red-100 p-4 rounded-lg text-center">{error}</p>
        <button
          onClick={fetchReportData}
          className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!isLoading && !error && chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
        <PresentationChartLineIcon className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-xl text-gray-500 text-center">Không có dữ liệu để hiển thị.</p>
        {/* Optionally, add a button to refresh or guide user if appropriate */}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 text-center">
          Báo Cáo Lợi Nhuận & Doanh Thu
        </h1>
        {/* Placeholder for Date Range Selector */}
        {/* <div className="text-center mt-2 text-sm text-gray-500">Jan 2023 - Dec 2023</div> */}
      </header>

      {/* KPI Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Revenue Card */}
        <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-600">Tổng Doanh Thu</h3>
              <CurrencyDollarIcon className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totals.revenue)}</p>
          </div>
          {/* <p className="text-sm text-gray-500 mt-2 flex items-center">
            <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
            {revenuePercentChange} so với tháng trước
          </p> */}
        </div>

        {/* Total Costs Card */}
        <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-600">Tổng Chi Phí</h3>
              <BriefcaseIcon className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(totals.cost)}</p>
          </div>
          {/* <p className="text-sm text-gray-500 mt-2 flex items-center">
            <ArrowUpIcon className="w-4 h-4 text-red-500 mr-1" />
            {costPercentChange} so với tháng trước
          </p> */}
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-6 shadow-lg rounded-xl border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-600">Lợi Nhuận Ròng</h3>
              <PresentationChartLineIcon className="w-8 h-8 text-blue-500" />
            </div>
            <p
              className={`text-3xl font-bold ${totals.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}
            >
              {formatCurrency(totals.profit)}
            </p>
          </div>
          {/* <p className="text-sm text-gray-500 mt-2 flex items-center">
            {totals.profit >= 0 ? <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" /> : <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />}
            {profitPercentChange} so với tháng trước
          </p> */}
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-white p-4 sm:p-6 shadow-xl rounded-xl border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-6 pl-2">
          Phân Tích Xu Hướng Theo Tháng
        </h2>
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{
                top: 5,
                right: 20,
                left: 50, // Increased left margin for YAxis labels
                bottom: 70, // Increased bottom margin for angled XAxis labels
              }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" vertical={false} />
              <XAxis
                dataKey="monthYearLabel"
                angle={-40}
                textAnchor="end"
                height={80} // Adjusted height for angled labels
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#d1d5db"
                dy={10} // Adjust position down
              />
              <YAxis
                tickFormatter={value => `${formatCurrency(value / 1000000)}M`} // Format as millions
                tickCount={6}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#d1d5db"
                label={{
                  value: 'Số tiền (Triệu VND)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -40,
                  style: { fontSize: 14, fill: '#4b5563' },
                }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(230, 230, 230, 0.3)' }} />
              <Legend
                verticalAlign="top"
                height={50}
                iconSize={14}
                wrapperStyle={{ fontSize: '14px' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Doanh thu"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2.5}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#059669' }}
              />
              <Area
                type="monotone"
                dataKey="cost"
                name="Chi phí"
                stroke="#F59E0B"
                fillOpacity={1}
                fill="url(#colorCost)"
                strokeWidth={2.5}
                activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#D97706' }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Lợi nhuận"
                stroke="#3B82F6"
                strokeWidth={3} // Bolder line for profit
                dot={<CustomizedProfitDot />}
                activeDot={{ r: 8, strokeWidth: 2, fill: '#fff', stroke: '#2563EB' }} // Larger active dot
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BaoCaoLoiNhuanDoanhThu;
