import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { vi } from 'date-fns/locale';
// SVG Icons
const ChevronLeftIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);
const ChevronRightIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
      clipRule="evenodd"
    />
  </svg>
);
const DateRangeFilter = ({ onFilterChange }) => {
  const [activeFilter, setActiveFilter] = useState('month'); // 'month' or 'range'
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });
  const handleMonthChange = increment => {
    setActiveFilter('month');
    const newMonth = addMonths(selectedMonth, increment);
    setSelectedMonth(newMonth);
    onFilterChange({
      type: 'month',
      date: newMonth,
    });
  };
  const handleDateRangeChange = dates => {
    const [start, end] = dates;
    setActiveFilter('range');
    setDateRange({
      startDate: start,
      endDate: end,
    });
    onFilterChange({
      type: 'range',
      startDate: start,
      endDate: end,
    });
  };
  const handleFilterTypeChange = type => {
    setActiveFilter(type);
    if (type === 'month') {
      onFilterChange({
        type: 'month',
        date: selectedMonth,
      });
    } else {
      onFilterChange({
        type: 'range',
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
    }
  };
  return (
    <div className="flex flex-col sm:flex-row gap-2 p-3 bg-white rounded-lg shadow-sm">
      {/* Month Picker with Navigation */}
      <div className={`flex items-center gap-1 ${activeFilter === 'range' ? 'opacity-50' : ''}`}>
        <button
          onClick={() => handleMonthChange(-1)}
          className="p-1 hover:bg-gray-100 rounded-full"
          title="Tháng trước"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <div
          className="px-3 py-1.5 border rounded-md cursor-pointer hover:bg-gray-50 text-sm"
          onClick={() => handleFilterTypeChange('month')}
        >
          {format(selectedMonth, 'MM/yyyy', { locale: vi })}
        </div>
        <button
          onClick={() => handleMonthChange(1)}
          className="p-1 hover:bg-gray-100 rounded-full"
          title="Tháng sau"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
      {/* Date Range Picker */}
      <div
        className={`flex items-center gap-1 ${activeFilter === 'month' ? 'opacity-50' : ''}`}
        onClick={() => handleFilterTypeChange('range')}
      >
        <DatePicker
          selectsRange={true}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onChange={handleDateRangeChange}
          dateFormat="dd/MM/yyyy"
          className="px-3 py-1.5 border rounded-md cursor-pointer hover:bg-gray-50 text-sm w-[200px]"
          placeholderText="Chọn khoảng thời gian"
          locale={vi}
        />
      </div>
    </div>
  );
};
export default DateRangeFilter;
