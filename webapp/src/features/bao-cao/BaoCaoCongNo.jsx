import React, { useState, useEffect } from 'react';
import { fetchDebtReport } from '@services/mockApi/index.js';
import DateRangeFilter from '@components/DateRangeFilter';
import StandardTable from '@/components/StandardTable';
import { format } from 'date-fns';
// SVG Icon for Download
const ArrowDownTrayIcon = ({ className = 'w-6 h-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);
// Helper to format currency
const formatCurrency = value => {
  if (typeof value !== 'number') return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};
const BaoCaoCongNo = () => {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  // Table columns configuration
  const columns = [
    {
      field: 'entityName', // key -> field
      headerName: 'Tên', // label -> headerName
      align: 'left',
      headerAlign: 'left',
      flex: 2, // Give more space to name
    },
    {
      field: 'entityType', // key -> field
      headerName: 'Nhóm', // label -> headerName
      align: 'left',
      headerAlign: 'left',
      renderCell: params => (params.value === 'customer' ? 'Khách hàng' : 'Đối tác'), // render -> renderCell
      flex: 1,
    },
    {
      field: 'phaiThu', // key -> field
      headerName: 'Phải Thu', // label -> headerName
      align: 'right',
      headerAlign: 'right',
      numeric: true, // Handled by StandardTable
      renderCell: params => formatCurrency(params.value), // render -> renderCell
      flex: 1,
    },
    {
      field: 'phaiTra', // key -> field
      headerName: 'Phải Trả', // label -> headerName
      align: 'right',
      headerAlign: 'right',
      numeric: true,
      renderCell: params => formatCurrency(params.value), // render -> renderCell
      flex: 1,
    },
    {
      field: 'ghiChu', // key -> field
      headerName: 'Ghi Chú', // label -> headerName
      align: 'left',
      headerAlign: 'left',
      flex: 1,
    },
  ];
  const fetchReportData = async monthYear => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDebtReport(monthYear);
      setReportData(data);
      setFilteredData(data);
    } catch (err) {
      setError('Không thể tải dữ liệu báo cáo.');

    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const currentDate = new Date();
    const currentMonthYear = format(currentDate, 'MM/yyyy');
    fetchReportData(currentMonthYear);
  }, []);
  const handleFilterChange = filterData => {
    if (filterData.type === 'month') {
      const monthStr = format(filterData.date, 'MM/yyyy');
      fetchReportData(monthStr);
    } else {
      const filtered = reportData.filter(item => {
        const [month, year] = item.monthYear.split('/');
        const itemDate = new Date(parseInt(year), parseInt(month) - 1);
        return itemDate >= filterData.startDate && itemDate <= filterData.endDate;
      });
      setFilteredData(filtered);
    }
  };
  const handleExportExcel = () => {
    alert('Chức năng Xuất Excel chưa được triển khai trong bản demo này.');
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Báo Cáo Công Nợ</h1>
      <DateRangeFilter onFilterChange={handleFilterChange} />
      {isLoading && <div className="text-center py-4">Đang tải dữ liệu...</div>}
      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}
      <StandardTable
        columns={columns}
        rows={filteredData} // data -> rows
        loading={isLoading}
        error={error}
        emptyMessage="Không có dữ liệu công nợ cho khoảng thời gian đã chọn"
      />
      {/* Summary totals */}
      {!isLoading && !error && filteredData.length > 0 && (
        <div className="bg-gray-50 px-6 py-4 border border-gray-200 rounded-b-lg -mt-2">
          <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-900">
            <div className="col-span-2">Tổng cộng</div>
            <div className="text-right">
              {formatCurrency(filteredData.reduce((sum, item) => sum + item.phaiThu, 0))}
            </div>
            <div className="text-right">
              {formatCurrency(filteredData.reduce((sum, item) => sum + item.phaiTra, 0))}
            </div>
            <div></div>
          </div>
        </div>
      )}
      {/* Export Excel Button */}
      <button
        onClick={handleExportExcel}
        className="fixed bottom-6 right-6 bg-teal-600 hover:bg-teal-700 text-white px-4 py-3 rounded-full shadow-lg flex items-center space-x-2 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
        title="Xuất báo cáo ra Excel"
      >
        <ArrowDownTrayIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Xuất Excel</span>
      </button>
    </div>
  );
};
export default BaoCaoCongNo;
