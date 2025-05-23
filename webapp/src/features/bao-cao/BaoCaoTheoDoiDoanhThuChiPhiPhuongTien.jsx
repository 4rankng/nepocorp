import React, { useState, useEffect, useCallback } from 'react';
import {
  getVehicleMonthlyDetailsReport,
  getVehiclesForSelect,
  getAvailableMonthsForReport,
} from '../../services/mockData';

// SVG Icon for Download
const ArrowDownTrayIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// Helper to format currency
const formatCurrency = (value) => {
  if (typeof value !== 'number') return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const BaoCaoTheoDoiDoanhThuChiPhiPhuongTien = () => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedMonthYear, setSelectedMonthYear] = useState('');
  
  const [reportDetails, setReportDetails] = useState(null);
  
  const [vehiclesForSelect, setVehiclesForSelect] = useState([]);
  const [monthsForSelect, setMonthsForSelect] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Vui lòng chọn xe và tháng để xem báo cáo.');

  const fetchDropdownData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [vehicles, months] = await Promise.all([
        getVehiclesForSelect(),
        getAvailableMonthsForReport(),
      ]);
      setVehiclesForSelect(vehicles);
      setMonthsForSelect(months);
      if (vehicles.length > 0) setSelectedVehicleId(vehicles[0].id); // Default select first vehicle
      if (months.length > 0) setSelectedMonthYear(months[0].value); // Default select first month
    } catch (err) {
      setError('Không thể tải dữ liệu cho các mục chọn.');
      console.error(err);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleViewReport = async () => {
    if (!selectedVehicleId || !selectedMonthYear) {
      setMessage('Vui lòng chọn đầy đủ xe và tháng.');
      setReportDetails(null);
      return;
    }
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await getVehicleMonthlyDetailsReport(selectedVehicleId, selectedMonthYear);
      setReportDetails(data);
      if (!data || data.shipmentDetails.length === 0 && data.otherCosts.length === 0) {
        setMessage(`Không có dữ liệu cho xe và tháng đã chọn.`);
      }
    } catch (err) {
      setError(`Lỗi khi tải báo cáo: ${err.message}`);
      setReportDetails(null);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExportExcel = () => {
    // This is a UI placeholder as per requirements
    console.log("Export to Excel clicked for:", selectedVehicleId, selectedMonthYear, reportDetails);
    alert("Chức năng Xuất Excel chưa được triển khai trong bản demo này.");
  };

  return (
    <div className="p-4 md:p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">
        Theo Dõi Doanh Thu/Chi Phí Theo Phương Tiện
      </h1>

      {/* Selection Controls */}
      <div className="mb-6 p-4 bg-white shadow-md rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="vehicleSelect" className="block text-sm font-medium text-gray-700 mb-1">Biển số xe</label>
            <select
              id="vehicleSelect"
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
              disabled={isLoading}
            >
              <option value="">Chọn xe</option>
              {vehiclesForSelect.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="monthSelect" className="block text-sm font-medium text-gray-700 mb-1">Tháng báo cáo</label>
            <select
              id="monthSelect"
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
              disabled={isLoading}
            >
              <option value="">Chọn tháng</option>
              {monthsForSelect.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <button
            onClick={handleViewReport}
            disabled={isLoading || !selectedVehicleId || !selectedMonthYear}
            className={`w-full md:w-auto px-4 py-2 bg-blue-600 text-white font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isLoading || !selectedVehicleId || !selectedMonthYear ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Đang tải...' : 'Xem báo cáo'}
          </button>
        </div>
      </div>

      {/* Report Display Area */}
      {isLoading && <div className="text-center py-4">Đang tải báo cáo...</div>}
      {!isLoading && error && <div className="text-center py-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
      {!isLoading && !error && !reportDetails && <div className="text-center py-4 text-gray-600">{message}</div>}

      {reportDetails && (
        <div className="space-y-6">
          {/* Overview Section */}
          <div className="bg-white p-4 shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Tổng Quan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-700">Tổng Doanh Thu</p>
                <p className="text-lg font-bold text-green-800">{formatCurrency(reportDetails.overview.totalRevenue)}</p>
              </div>
              <div className="p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-700">Tổng Chi Phí</p>
                <p className="text-lg font-bold text-red-800">{formatCurrency(reportDetails.overview.grandTotalCosts)}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">Tổng Lợi Nhuận</p>
                <p className="text-lg font-bold text-blue-800">{formatCurrency(reportDetails.overview.grandTotalProfit)}</p>
              </div>
            </div>
          </div>

          {/* Shipment Details Section */}
          {reportDetails.shipmentDetails.length > 0 && (
            <div className="bg-white p-4 shadow rounded-lg">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Chi Tiết Theo Chuyến</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {reportDetails.shipmentDetails.map(plan => (
                  <div key={plan.id} className="border border-gray-200 p-4 rounded-md space-y-2 bg-gray-50">
                    <p><strong>Ngày:</strong> {plan.ngayThang}</p>
                    <p><strong>Diễn giải:</strong> {plan.dienGiai}</p>
                    <p><strong>Số Cont:</strong> {plan.thongTinContainer?.map(c => c.soContainer).join(', ') || '-'}</p>
                    <p><strong>Tuyến:</strong> {plan.tuyenDuong.diemDi} - {Array.isArray(plan.tuyenDuong.diemDen) ? plan.tuyenDuong.diemDen.join(', ') : plan.tuyenDuong.diemDen}</p>
                    <p><strong>Dầu:</strong> {plan.dauLit || 0} lít ({formatCurrency(plan.dauDong || 0)})</p>
                    <p><strong>Phí đi đường:</strong> {formatCurrency(plan.phiDiDuong || 0)}</p>
                    <p><strong>Tổng chi phí chuyến:</strong> {formatCurrency(plan.tongChiPhiPhuongTien || 0)}</p>
                    <p><strong>Cước vận chuyển:</strong> {formatCurrency(plan.cuocVanChuyen || 0)}</p>
                    <p className="font-semibold"><strong>Lợi nhuận chuyến:</strong> {formatCurrency(plan.loiNhuanPhuongTien || 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Other Costs Section */}
          {reportDetails.otherCosts.length > 0 && (
            <div className="bg-white p-4 shadow rounded-lg">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Chi Phí Khác</h2>
              <ul className="divide-y divide-gray-200">
                {reportDetails.otherCosts.map(cost => (
                  <li key={cost.id} className="py-2 flex justify-between">
                    <span>{cost.description}</span>
                    <span>{formatCurrency(cost.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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

export default BaoCaoTheoDoiDoanhThuChiPhiPhuongTien;
