import React, { useState, useEffect, useCallback } from 'react';
import { getDebtReport, getAvailableMonthsForDebtReport } from '../../services/mockData';

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
  const [selectedMonthYear, setSelectedMonthYear] = useState('');
  const [reportData, setReportData] = useState([]);
  const [monthsForSelect, setMonthsForSelect] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Vui lòng chọn tháng để xem báo cáo.');

  const fetchAvailableMonths = useCallback(async () => {
    setIsLoading(true); // For initial dropdown loading
    try {
      const months = await getAvailableMonthsForDebtReport();
      setMonthsForSelect(months);
      if (months.length > 0) {
        setSelectedMonthYear(months[0].value); // Default to the most recent month
      } else {
        setMessage('Không có dữ liệu tháng nào để hiển thị công nợ.');
      }
    } catch (err) {
      setError('Không thể tải danh sách tháng.');
      console.error(err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAvailableMonths();
  }, [fetchAvailableMonths]);

  const handleViewReport = async () => {
    if (!selectedMonthYear) {
      setMessage('Vui lòng chọn tháng.');
      setReportData([]);
      return;
    }
    setIsLoadingReport(true);
    setError('');
    setMessage('');
    try {
      const data = await getDebtReport(selectedMonthYear);
      setReportData(data);
      if (data.length === 0) {
        setMessage(
          `Không có dữ liệu công nợ cho tháng ${selectedMonthYear.substring(5)}/${selectedMonthYear.substring(0, 4)}.`
        );
      }
    } catch (err) {
      setError(`Lỗi khi tải báo cáo công nợ: ${err.message}`);
      setReportData([]);
      console.error(err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleExportExcel = () => {
    console.log('Export Debt Report to Excel clicked for month:', selectedMonthYear, reportData);
    alert('Chức năng Xuất Excel chưa được triển khai trong bản demo này.');
  };

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">
        Báo Cáo Công Nợ
      </h1>

      {/* Selection Controls */}
      <div className="mb-6 p-4 bg-white shadow-md rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label htmlFor="monthSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Tháng theo dõi
            </label>
            <select
              id="monthSelect"
              value={selectedMonthYear}
              onChange={e => setSelectedMonthYear(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
              disabled={isLoading || monthsForSelect.length === 0}
            >
              {monthsForSelect.length === 0 && !isLoading && (
                <option value="">Không có tháng</option>
              )}
              {monthsForSelect.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1">
            <button
              onClick={handleViewReport}
              disabled={isLoadingReport || !selectedMonthYear}
              className={`w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoadingReport || !selectedMonthYear ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoadingReport ? 'Đang tải...' : 'Xem báo cáo'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Display Area */}
      {isLoadingReport && <div className="text-center py-4">Đang tải báo cáo công nợ...</div>}
      {!isLoadingReport && error && (
        <div className="text-center py-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</div>
      )}
      {!isLoadingReport && !error && reportData.length === 0 && (
        <div className="text-center py-4 text-gray-600">{message}</div>
      )}

      {!isLoadingReport && !error && reportData.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Tên Đơn Vị
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Phải Thu
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Phải Trả
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Ghi Chú
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.entityName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(item.phaiThu)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(item.phaiTra)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.ghiChu || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
