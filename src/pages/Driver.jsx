import React, { useState, useEffect } from 'react';

// Inline SVGs for icons
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 ml-2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-3.75h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
  </svg>
);

const initialTripsData = [
  { id: 'T001', ngayDi: '2025-05-21', ngayDen: '2025-05-21', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
  { id: 'T002', ngayDi: '2025-05-22', ngayDen: '2025-05-22', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
  { id: 'T003', ngayDi: '2025-05-23', ngayDen: '2025-05-23', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
  { id: 'T004', ngayDi: '2025-05-24', ngayDen: '2025-05-24', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
  { id: 'T005', ngayDi: '2025-05-25', ngayDen: '2025-05-25', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
  { id: 'T006', ngayDi: '2025-05-25', ngayDen: '2025-05-25', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
  { id: 'T007', ngayDi: '2025-05-25', ngayDen: '2025-05-21', bienSoXe: '15C-7661H', troCap: 2000000, dau: 40 },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('de-DE').format(amount) + ' đ'; // de-DE uses dots as thousand separators
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
};

export default function Driver() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 4, 1)); // May 2025
  const [trips, setTrips] = useState(initialTripsData);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formattedMonthYear = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Hardcoded data for Tong Quan section as per image
  const ngayCong = 22;
  const luong = 15000000;

  return (
    <div className="p-4 md:p-6 text-gray-800" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      {/* Month Picker */}
      <div className="flex items-center justify-start mb-8">
        <button onClick={handlePrevMonth} className="p-2 border border-gray-300 rounded hover:bg-gray-100">
          <ChevronLeftIcon />
        </button>
        <div className="mx-4 flex items-center justify-center px-4 py-2 border border-gray-300 rounded min-w-[150px] text-center">
          <span className="font-medium">{formattedMonthYear}</span>
          <CalendarIcon />
        </div>
        <button onClick={handleNextMonth} className="p-2 border border-gray-300 rounded hover:bg-gray-100">
          <ChevronRightIcon />
        </button>
      </div>

      {/* Tong quan */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-3">Tổng quan</h2>
        <div className="flex space-x-12 items-end">
          <div>
            <p className="text-sm text-gray-500 mb-1">Ngày công</p>
            <p className="text-3xl font-bold">{ngayCong}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Lương</p>
            <p className="text-3xl font-bold">{formatCurrency(luong)}</p>
          </div>
        </div>
      </div>

      {/* Lich su chuyen di */}
      <div>
        <h2 className="text-xl font-bold mb-3">Lịch sử chuyến đi</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full w-full table-auto border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r border-gray-200">Ngày đi</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r border-gray-200">Ngày đến</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r border-gray-200">Biển số xe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r border-gray-200">Trợ cấp đi đường</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">dầu (l)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-gray-200">{formatDate(trip.ngayDi)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-gray-200">{formatDate(trip.ngayDen)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm border-r border-gray-200">{trip.bienSoXe}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right border-r border-gray-200">{formatCurrency(trip.troCap)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">{trip.dau}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
