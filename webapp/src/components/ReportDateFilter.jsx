import React, { useState, useEffect } from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
// SVG Icons for navigation
const ChevronLeftIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);
const ChevronRightIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
  </svg>
);
const ReportDateFilter = ({ onFilterChange }) => {
  // Get current month's first and last day
  const today = dayjs();
  const [selectedMonth, setSelectedMonth] = useState(today);
  const [dateRange, setDateRange] = useState({
    from: today.startOf('month'),
    to: today.endOf('month'),
  });
  // Handle month navigation
  const handlePrevMonth = () => {
    const newMonth = selectedMonth.subtract(1, 'month');
    setSelectedMonth(newMonth);
    onFilterChange({
      type: 'month',
      value: newMonth.format('YYYY-MM'),
    });
  };
  const handleNextMonth = () => {
    const newMonth = selectedMonth.add(1, 'month');
    setSelectedMonth(newMonth);
    onFilterChange({
      type: 'month',
      value: newMonth.format('YYYY-MM'),
    });
  };
  // Handle date range changes
  const handleDateRangeChange = (type, newValue) => {
    const newRange = { ...dateRange, [type]: newValue };
    setDateRange(newRange);
    onFilterChange({
      type: 'range',
      value: {
        from: newRange.from.format('YYYY-MM-DD'),
        to: newRange.to.format('YYYY-MM-DD'),
      },
    });
  };
  // Initial filter notification
  useEffect(() => {
    onFilterChange({
      type: 'month',
      value: selectedMonth.format('YYYY-MM'),
    });
  }, []);
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="space-y-4">
          {/* Month Selector with Navigation */}
          <div className="flex items-center justify-between space-x-4 p-2 border rounded-lg">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Tháng trước"
            >
              <ChevronLeftIcon />
            </button>
            <span className="text-lg font-medium">Tháng {selectedMonth.format('MM/YYYY')}</span>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Tháng sau"
            >
              <ChevronRightIcon />
            </button>
          </div>
          {/* Date Range Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
              <DatePicker
                value={dateRange.from}
                onChange={newValue => handleDateRangeChange('from', newValue)}
                format="DD/MM/YYYY"
                className="w-full"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                  },
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
              <DatePicker
                value={dateRange.to}
                onChange={newValue => handleDateRangeChange('to', newValue)}
                format="DD/MM/YYYY"
                className="w-full"
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </LocalizationProvider>
  );
};
export default ReportDateFilter;
