import React, { useState, useEffect } from 'react';
import { getDebtReport } from '@services/mockData';
import DateRangeFilter from '../../components/DateRangeFilter';
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

  const fetchReportData = async monthYear => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getDebtReport(monthYear);
      setReportData(data);
      setFilteredData(data);
    } catch (err) {
      setError('Không thể tải dữ liệu báo cáo.');
      console.error(err);
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
    console.log('Export Debt Report to Excel clicked for month:', filteredData);
    alert('Chức năng Xuất Excel chưa được triển khai trong bản demo này.');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Báo Cáo Công Nợ</h1>

      <DateRangeFilter onFilterChange={handleFilterChange} />

      {isLoading && <div className="text-center py-4">Đang tải dữ liệu...</div>}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md">{error}</div>}

      {!isLoading && !error && filteredData.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên Đối Tượng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loại
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phải Thu
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phải Trả
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ghi Chú
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.entityName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.entityType === 'customer' ? 'Khách hàng' : 'Đối tác'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.phaiThu)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.phaiTra)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.ghiChu}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td
                    colSpan="2"
                    className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"
                  >
                    Tổng cộng
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(filteredData.reduce((sum, item) => sum + item.phaiThu, 0))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                    {formatCurrency(filteredData.reduce((sum, item) => sum + item.phaiTra, 0))}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!isLoading && !error && filteredData.length === 0 && (
        <div className="text-center text-gray-500 bg-white p-8 rounded-lg shadow">
          Không có dữ liệu công nợ cho khoảng thời gian đã chọn
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
