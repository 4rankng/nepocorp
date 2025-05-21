import React, { useState } from 'react';
import { formatCurrency } from '../utils/format'; // Assuming this utility exists

const TruckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 17H6v-6h7V4H6V2h7l5 5v10h-5zM2 11h4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 17H6.236M10.264 4H6v7h4.264M15 7l-2-2m0 0L11 7" /> 
  </svg>
);

const mockPlansData = [
  { id: 'P001', date: '2025-05-28', customer: 'Công ty X', status: 'new', details: 'Chở hàng điện tử', notesRead: false }, // 'new' means unread
  { id: 'P002', date: '2025-05-29', customer: 'Công ty Y', status: 'new', details: 'Chở hàng may mặc', notesRead: false },
  { id: 'P003', date: '2025-05-25', customer: 'Công ty Z', status: 'viewed', details: 'Chở hàng nông sản', notesRead: true }, // 'viewed' means read
  { id: 'P004', date: '2025-05-26', customer: 'Công ty A', status: 'completed', details: 'Chở vật liệu xây dựng', notesRead: true },
];

const mockVehiclesData = [
  { id: '51C-12345', name: 'Xe tải Huyndai', type: 'Container 20ft' },
  { id: '29H-67890', name: 'Xe đầu kéo Isuzu', type: 'Container 40ft' },
  { id: '60A-11223', name: 'Xe tải Thaco', type: 'Thùng bạt' },
];

const mockDebtData = [
  { id: 'D001', entity: 'Công ty A', receivable: 10000000, payable: 5000000, notes: 'Chưa thanh toán' },
  { id: 'D002', entity: 'Công ty B', receivable: 7000000, payable: 2000000, notes: 'Đã thanh toán' },
  { id: 'D003', entity: 'Đối tác Vận Tải C', receivable: 0, payable: 12000000, notes: 'Chưa thanh toán tiền cước' },
];

export default function Accountant() {
  const [activeTab, setActiveTab] = useState('plans'); // plans, vehicles, debt
  const [plans, setPlans] = useState(mockPlansData);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);

  // Form state for Trip Costs (will be populated by selected plan later)
  const [tripCosts, setTripCosts] = useState({
    kmHang: '', kmRong: '', litDau: '', tongChiPhiDau: '', chiPhiDuong: ''
  });

  // Form state for Monthly Vehicle Costs (will be populated by selected vehicle later)
  const [monthlyVehicleCosts, setMonthlyVehicleCosts] = useState({
    phiGuiXe: '', epass: '', baoHiem: '', suaChua: '', luongLaiXe: '', khac: ''
  });

  const handlePlanSelect = (planId) => {
    setSelectedPlanId(planId);
    setSelectedVehicleId(null); // Clear vehicle selection
    // Mark plan as read if it's new
    setPlans(prevPlans => 
      prevPlans.map(p => p.id === planId ? { ...p, status: p.status === 'new' ? 'viewed' : p.status, notesRead: true } : p)
    );
    // Reset and potentially load existing costs for the selected plan in a real app
    setTripCosts({ kmHang: '', kmRong: '', litDau: '', tongChiPhiDau: '', chiPhiDuong: '' });
  };

  const handleVehicleSelect = (vehicleId) => {
    setSelectedVehicleId(vehicleId);
    setSelectedPlanId(null); // Clear plan selection
    // Reset and potentially load existing costs for the selected vehicle in a real app
    setMonthlyVehicleCosts({ phiGuiXe: '', epass: '', baoHiem: '', suaChua: '', luongLaiXe: '', khac: '' });
  };

  const handleTripCostChange = (e) => {
    setTripCosts({ ...tripCosts, [e.target.name]: e.target.value });
  };

  const handleMonthlyVehicleCostChange = (e) => {
    setMonthlyVehicleCosts({ ...monthlyVehicleCosts, [e.target.name]: e.target.value });
  };

  const renderTripCostForm = () => {
    if (!selectedPlanId) return null;
    const plan = plans.find(p => p.id === selectedPlanId);
    return (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold mb-3 text-lg">Nhập chi phí cho chuyến: <span className='text-blue-600'>{plan?.id} - {plan?.customer}</span></h3>
        <form className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className='block text-sm font-medium'>Số km hàng</label><input name="kmHang" value={tripCosts.kmHang} onChange={handleTripCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Số km chạy rỗng</label><input name="kmRong" value={tripCosts.kmRong} onChange={handleTripCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Số lít dầu</label><input name="litDau" value={tripCosts.litDau} onChange={handleTripCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Tổng chi phí dầu</label><input name="tongChiPhiDau" value={tripCosts.tongChiPhiDau} onChange={handleTripCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
          </div>
          <div><label className='block text-sm font-medium'>Chi phí đường, phí cầu đường, nâng hạ, chi hộ</label><input name="chiPhiDuong" value={tripCosts.chiPhiDuong} onChange={handleTripCostChange} className="border rounded w-full p-2 mt-1" type="text" /></div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-semibold" type="submit">Lưu chi phí chuyến</button>
        </form>
      </div>
    );
  };

  const renderMonthlyVehicleCostForm = () => {
    if (!selectedVehicleId) return null;
    const vehicle = mockVehiclesData.find(v => v.id === selectedVehicleId);
    return (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold mb-3 text-lg">Nhập chi phí phát sinh cho xe: <span className='text-green-600'>{vehicle?.id}</span></h3>
        <form className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className='block text-sm font-medium'>Phí gửi xe</label><input name="phiGuiXe" value={monthlyVehicleCosts.phiGuiXe} onChange={handleMonthlyVehicleCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Epass</label><input name="epass" value={monthlyVehicleCosts.epass} onChange={handleMonthlyVehicleCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Bảo hiểm</label><input name="baoHiem" value={monthlyVehicleCosts.baoHiem} onChange={handleMonthlyVehicleCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Sửa chữa</label><input name="suaChua" value={monthlyVehicleCosts.suaChua} onChange={handleMonthlyVehicleCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Lương lái xe</label><input name="luongLaiXe" value={monthlyVehicleCosts.luongLaiXe} onChange={handleMonthlyVehicleCostChange} className="border rounded w-full p-2 mt-1" type="number" /></div>
            <div><label className='block text-sm font-medium'>Khác</label><input name="khac" value={monthlyVehicleCosts.khac} onChange={handleMonthlyVehicleCostChange} className="border rounded w-full p-2 mt-1" type="text" /></div>
          </div>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold" type="submit">Lưu chi phí xe</button>
        </form>
      </div>
    );
  };

  const TabButton = ({ tabName, currentTab, setTab, children }) => (
    <button
      onClick={() => { setTab(tabName); setSelectedPlanId(null); setSelectedVehicleId(null); }}
      className={`py-3 px-4 font-medium text-sm rounded-t-md focus:outline-none whitespace-nowrap 
        ${currentTab === tabName 
          ? 'bg-white border-t border-l border-r border-gray-300 text-blue-600 -mb-px'
          : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-2 sm:px-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-full">
        <div className="flex border-b border-gray-300 mb-2">
          <TabButton tabName="plans" currentTab={activeTab} setTab={setActiveTab}>Kế Hoạch Vận Chuyển</TabButton>
          <TabButton tabName="vehicles" currentTab={activeTab} setTab={setActiveTab}>Danh Sách Xe</TabButton>
          <TabButton tabName="debt" currentTab={activeTab} setTab={setActiveTab}>Công Nợ</TabButton>
        </div>

        {activeTab === 'plans' && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Kế Hoạch Vận Chuyển</h2>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h3 className="text-lg font-medium mb-2 text-red-600">Mới ({plans.filter(p => p.status === 'new').length})</h3>
                <ul className="space-y-2">
                  {plans.filter(p => p.status === 'new').map(plan => (
                    <li key={plan.id} onClick={() => handlePlanSelect(plan.id)} 
                        className={`p-3 border rounded-md cursor-pointer hover:bg-red-50 ${selectedPlanId === plan.id ? 'bg-red-100 border-red-400 shadow-md' : 'border-gray-200'}`}>
                      <p className="font-semibold">{plan.id} - {plan.customer}</p>
                      <p className="text-sm text-gray-600">Ngày: {plan.date} - {plan.details}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium mb-2 text-green-600">Đã Xem / Hoàn Thành ({plans.filter(p => p.status !== 'new').length})</h3>
                <ul className="space-y-2 max-h-96 overflow-y-auto">
                  {plans.filter(p => p.status !== 'new').map(plan => (
                    <li key={plan.id} onClick={() => handlePlanSelect(plan.id)} 
                        className={`p-3 border rounded-md cursor-pointer hover:bg-green-50 ${selectedPlanId === plan.id ? 'bg-green-100 border-green-400 shadow-md' : 'border-gray-200'}`}>
                      <p className="font-semibold">{plan.id} - {plan.customer}</p>
                      <p className="text-sm text-gray-600">Ngày: {plan.date} - Trạng thái: {plan.status} - {plan.details}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {renderTripCostForm()}
          </div>
        )}

        {activeTab === 'vehicles' && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Danh Sách Xe</h2>
            <ul className="space-y-2">
              {mockVehiclesData.map(vehicle => (
                <li key={vehicle.id} onClick={() => handleVehicleSelect(vehicle.id)} 
                    className={`p-3 border rounded-md cursor-pointer hover:bg-indigo-50 flex items-center ${selectedVehicleId === vehicle.id ? 'bg-indigo-100 border-indigo-400 shadow-md' : 'border-gray-200'}`}>
                  <TruckIcon />
                  <div>
                    <p className="font-semibold text-indigo-700">{vehicle.id} ({vehicle.name})</p>
                    <p className="text-sm text-gray-600">Loại: {vehicle.type}</p>
                  </div>
                </li>
              ))}
            </ul>
            {renderMonthlyVehicleCostForm()}
          </div>
        )}

        {activeTab === 'debt' && (
          <div>
            <h2 className="text-xl font-semibold mb-3">Công Nợ Phải Thu / Phải Trả</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full w-full table-auto border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r">Tên đơn vị</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r">Phải thu</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-r">Phải trả</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mockDebtData.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-r">{item.entity}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right border-r">{formatCurrency(item.receivable)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right border-r">{formatCurrency(item.payable)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
