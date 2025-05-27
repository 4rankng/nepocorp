import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchVehicleMonthlyDetailsReport,
  fetchAvailableMonthsForReport,
} from '@services/mockApi/index.js';
import { fetchAllDauKeo, fetchAllRoMooc } from '@services/mockApi/index.js';

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

// Helper to format vehicles for select dropdown
const formatVehiclesForSelect = (dauKeoList, roMoocList) => {
  const allVehicles = [];

  dauKeoList.forEach(dauKeo => {
    allVehicles.push({
      id: `dauKeo-${dauKeo.id}`,
      value: `dauKeo-${dauKeo.id}`,
      label: `${dauKeo.bienSoXe} (Đầu kéo)`,
      bienSoXe: dauKeo.bienSoXe,
      type: 'dauKeo',
    });
  });

  roMoocList.forEach(roMooc => {
    allVehicles.push({
      id: `roMooc-${roMooc.id}`,
      value: `roMooc-${roMooc.id}`,
      label: `${roMooc.bienSoXe} (Rơ moóc)`,
      bienSoXe: roMooc.bienSoXe,
      type: 'roMooc',
    });
  });

  return allVehicles;
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
      const [dauKeoList, roMoocList, months] = await Promise.all([
        fetchAllDauKeo(),
        fetchAllRoMooc(),
        fetchAvailableMonthsForReport(),
      ]);

      const vehicles = formatVehiclesForSelect(dauKeoList, roMoocList);
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
      const data = await fetchVehicleMonthlyDetailsReport(selectedVehicleId, selectedMonthYear);

      if (!data) {
        setMessage(`Không có dữ liệu cho xe và tháng đã chọn.`);
        setReportDetails(null);
        return;
      }

      // Transform the data into the expected format
      const transformedData = {
        overview: {
          totalRevenue: data.revenue,
          grandTotalCosts: data.totalCosts,
          grandTotalProfit: data.profit,
        },
        shipmentDetails: data.trips.map(trip => ({
          id: trip.tripId,
          ngayThang: trip.date,
          dienGiai: trip.route,
          tuyenDuong: {
            diemDi: trip.route.split(' - ')[0] || '',
            diemDen: trip.route.split(' - ')[1] || '',
          },
          dauLit: Math.floor(trip.distance / 10), // Rough estimate
          dauDong: trip.revenue * 0.3, // Rough estimate 30% fuel cost
          phiDiDuong: trip.revenue * 0.1, // Rough estimate 10% road cost
          tongChiPhiPhuongTien: trip.revenue * 0.6, // Rough estimate 60% total cost
          cuocVanChuyen: trip.revenue,
          loiNhuanPhuongTien: trip.revenue * 0.4, // Rough estimate 40% profit
          thongTinContainer: `Container - ${trip.customer}`,
        })),
        otherCosts: data.costBreakdown || [],
      };

      setReportDetails(transformedData);
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
    console.log(
      'Export to Excel clicked for:',
      selectedVehicleId,
      selectedMonthYear,
      reportDetails
    );
    alert('Chức năng Xuất Excel chưa được triển khai trong bản demo này.');
  };

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-800 text-center">
        Theo Dõi Doanh Thu/Chi Phí Theo Phương Tiện
      </h1>

      {/* Selection Controls */}
      <div className="mb-6 p-4 bg-white shadow-md rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="vehicleSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Biển số xe
            </label>
            <select
              id="vehicleSelect"
              value={selectedVehicleId}
              onChange={e => setSelectedVehicleId(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
              disabled={isLoading}
            >
              <option value="">Chọn xe</option>
              {vehiclesForSelect.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="monthSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Tháng báo cáo
            </label>
            <select
              id="monthSelect"
              value={selectedMonthYear}
              onChange={e => setSelectedMonthYear(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-white"
              disabled={isLoading}
            >
              <option value="">Chọn tháng</option>
              {monthsForSelect.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
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
      {!isLoading && error && (
        <div className="text-center py-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</div>
      )}
      {!isLoading && !error && !reportDetails && (
        <div className="text-center py-4 text-gray-600">{message}</div>
      )}

      {reportDetails && (
        <div className="space-y-6">
          {/* Overview Section */}
          <div className="bg-white p-4 shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-gray-700">Tổng Quan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-green-50 rounded-md">
                <p className="text-sm text-green-700">Tổng Doanh Thu</p>
                <p className="text-lg font-bold text-green-800">
                  {formatCurrency(reportDetails.overview.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-md">
                <p className="text-sm text-red-700">Tổng Chi Phí</p>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency(reportDetails.overview.grandTotalCosts)}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-700">Tổng Lợi Nhuận</p>
                <p className="text-lg font-bold text-blue-800">
                  {formatCurrency(reportDetails.overview.grandTotalProfit)}
                </p>
              </div>
            </div>
          </div>

          {/* Shipment Details Section */}
          {reportDetails.shipmentDetails.length > 0 && (
            <div className="bg-white p-4 shadow rounded-lg">
              <h2 className="text-xl font-semibold mb-3 text-gray-700">Chi Tiết Theo Chuyến</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {reportDetails.shipmentDetails.map(plan => (
                  <div
                    key={plan.id}
                    className="relative group bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 overflow-hidden flex flex-col min-h-[270px]"
                  >
                    {/* Accent bar */}
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-teal-400" />
                    <div className="flex-1 p-2 md:p-4 pl-6 flex flex-col gap-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400 font-medium">Ngày</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {plan.ngayThang}
                        </span>
                      </div>
                      <div className="mb-1">
                        <span className="block text-xs text-gray-400 font-medium">Diễn giải</span>
                        <span
                          className="block text-sm font-semibold text-blue-700 break-words"
                          title={plan.dienGiai}
                        >
                          {plan.dienGiai}
                        </span>
                      </div>
                      <div className="mb-1">
                        <span className="block text-xs text-gray-400 font-medium">Số Cont</span>
                        <span className="block text-sm font-mono text-teal-700 break-words">
                          {plan.thongTinContainer?.map(c => c.soContainer).join(', ') || '-'}
                        </span>
                      </div>
                      <div className="mb-1">
                        <span className="block text-xs text-gray-400 font-medium">Tuyến</span>
                        <span className="block text-xs font-medium text-gray-600 leading-tight break-words">
                          {plan.tuyenDuong.diemDi} -{' '}
                          {Array.isArray(plan.tuyenDuong.diemDen)
                            ? plan.tuyenDuong.diemDen.join(', ')
                            : plan.tuyenDuong.diemDen}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 text-xs">
                        <div className="text-gray-500">Dầu</div>
                        <div className="text-right text-gray-700">
                          {plan.dauLit || 0} lít{' '}
                          <span className="text-gray-400">
                            ({formatCurrency(plan.dauDong || 0)})
                          </span>
                        </div>
                        <div className="text-gray-500">Phí đi đường</div>
                        <div className="text-right text-gray-700">
                          {formatCurrency(plan.phiDiDuong || 0)}
                        </div>
                        <div className="text-gray-500">Tổng chi phí</div>
                        <div className="text-right text-gray-700">
                          {formatCurrency(plan.tongChiPhiPhuongTien || 0)}
                        </div>
                        <div className="text-gray-500">Cước vận chuyển</div>
                        <div className="text-right text-gray-700">
                          {formatCurrency(plan.cuocVanChuyen || 0)}
                        </div>
                      </div>
                      <div className="mt-2 text-right text-base font-bold text-green-600">
                        Lợi nhuận: {formatCurrency(plan.loiNhuanPhuongTien || 0)}
                      </div>
                    </div>
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
