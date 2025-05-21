import React, { useState } from 'react';
import ReturnToHomeButton from '../components/ReturnToHomeButton';

const mockScheduleData = [
  { id: 'S001', date: '2025-05-28', tripId: 'T101', customer: 'Công ty Alpha', origin: 'Cảng Cát Lái', destination: 'KCN Sóng Thần', status: 'Chưa thực hiện', contNumber: '', sealNumber: '' },
  { id: 'S002', date: '2025-05-28', tripId: 'T102', customer: 'Công ty Beta', origin: 'KCN Tân Tạo', destination: 'Cảng Cái Mép', status: 'Đang thực hiện', contNumber: 'CONT2345', sealNumber: 'SEALB678' },
  { id: 'S003', date: '2025-05-29', tripId: 'T103', customer: 'Công ty Gamma', origin: 'Cảng VICT', destination: 'KCN Amata', status: 'Chưa thực hiện', contNumber: '', sealNumber: '' },
];

const initialCostRequest = {
  requestType: 'tam_ung', // tam_ung, hoan_ung
  liftingCost: '',
  declarationCost: '',
  inspectionCost: '',
  infraCost: '',
  paymentOnBehalfCost: '',
  totalAmount: '',
  notes: ''
};

export default function GiaoNhan() {
  const [activeTab, setActiveTab] = useState('schedule'); // schedule, costRequest
  const [schedule, setSchedule] = useState(mockScheduleData);
  const [selectedTrip, setSelectedTrip] = useState(null); // For schedule item form
  const [tripDetails, setTripDetails] = useState({ contNumber: '', sealNumber: ''});
  const [costRequest, setCostRequest] = useState(initialCostRequest);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedTrip(null); // Clear selection when changing tabs
  };

  const handleTripSelect = (trip) => {
    setSelectedTrip(trip);
    setTripDetails({ contNumber: trip.contNumber || '', sealNumber: trip.sealNumber || '' });
  };

  const handleTripDetailChange = (e) => {
    setTripDetails({ ...tripDetails, [e.target.name]: e.target.value });
  };

  const handleSaveTripDetails = (e) => {
    e.preventDefault();
    setSchedule(prevSchedule =>
      prevSchedule.map(item =>
        item.id === selectedTrip.id ? { ...item, ...tripDetails, status: 'Đã cập nhật' } : item
      )
    );
    setSelectedTrip(null); // Close form
    alert('Thông tin chuyến đi đã được cập nhật!');
  };

  const handleCostRequestChange = (e) => {
    const { name, value } = e.target;
    let newTotal = parseFloat(costRequest.totalAmount) || 0;
    if (['liftingCost', 'declarationCost', 'inspectionCost', 'infraCost', 'paymentOnBehalfCost'].includes(name)) {
        // Calculate total if one of the cost fields changes
        const currentVal = parseFloat(costRequest[name]) || 0;
        const newVal = parseFloat(value) || 0;
        newTotal = newTotal - currentVal + newVal;
    }

    setCostRequest(prev => ({
         ...prev,
         [name]: value,
         totalAmount: (name !== 'totalAmount' && name !== 'requestType' && name !== 'notes') ? String(newTotal) : (name === 'totalAmount' ? value : prev.totalAmount)
    }));
  };

  const handleCostRequestSubmit = (e) => {
    e.preventDefault();
    console.log('Cost Request Submitted:', costRequest);
    alert('Yêu cầu chi phí đã được gửi!');
    setCostRequest(initialCostRequest); // Reset form
  };

  const TabButton = ({ tabName, title }) => (
    <button
      onClick={() => handleTabChange(tabName)}
      className={`py-3 px-5 font-medium text-sm rounded-t-lg focus:outline-none whitespace-nowrap
        ${
          activeTab === tabName
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-gray-600 hover:text-blue-700 hover:bg-gray-100'
        }`}
    >
      {title}
    </button>
  );

  const renderScheduleForm = () => {
    if (!selectedTrip) return null;
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">Cập nhật chi tiết cho chuyến: <span className='text-blue-600'>{selectedTrip.tripId}</span></h3>
          <form onSubmit={handleSaveTripDetails} className="space-y-4">
            <div>
              <label htmlFor="contNumber" className="block text-sm font-medium text-gray-700">Số container</label>
              <input type="text" name="contNumber" id="contNumber" value={tripDetails.contNumber} onChange={handleTripDetailChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="sealNumber" className="block text-sm font-medium text-gray-700">Số seal theo kế hoạch</label>
              <input type="text" name="sealNumber" id="sealNumber" value={tripDetails.sealNumber} onChange={handleTripDetailChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setSelectedTrip(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm">Lưu</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-2 sm:px-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-full">
        <div className="flex space-x-1 border-b border-gray-200 mb-6">
          <TabButton tabName="schedule" title="Lịch Vận Chuyển" />
          <TabButton tabName="costRequest" title="Yêu Cầu Chi Phí" />
        </div>

        {activeTab === 'schedule' && (
          <div>
            <h2 className="text-xl font-bold mb-4 text-gray-800">Lịch Vận Chuyển Theo Ngày</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full w-full table-auto border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    {['Ngày', 'Chuyến ID', 'Khách Hàng', 'Nơi đi', 'Nơi đến', 'Trạng Thái', 'Số Cont', 'Số Seal', 'Thao Tác'].map(header => (
                      <th key={header} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-300">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schedule.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.tripId}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.customer}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.origin}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.destination}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm border-b border-gray-200">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'Chưa thực hiện' ? 'bg-yellow-100 text-yellow-800' : item.status === 'Đang thực hiện' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.contNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">{item.sealNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-200">
                        <button onClick={() => handleTripSelect(item)} className="text-blue-600 hover:text-blue-800 font-medium">Nhập liệu</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderScheduleForm()}
          </div>
        )}

        {activeTab === 'costRequest' && (
          <div>
            <h2 className="text-xl font-bold mb-6 text-gray-800">Tạo Yêu Cầu Tạm Ứng / Hoàn Ứng</h2>
            <form onSubmit={handleCostRequestSubmit} className="space-y-6 bg-gray-50 p-6 rounded-lg shadow">
              <div>
                <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">Loại yêu cầu</label>
                <select id="requestType" name="requestType" value={costRequest.requestType} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                  <option value="tam_ung">Tạm ứng</option>
                  <option value="hoan_ung">Hoàn ứng</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="liftingCost" className="block text-sm font-medium text-gray-700 mb-1">Phí nâng hạ (VNĐ)</label>
                  <input type="number" name="liftingCost" id="liftingCost" value={costRequest.liftingCost} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="0" />
                </div>
                <div>
                  <label htmlFor="declarationCost" className="block text-sm font-medium text-gray-700 mb-1">Phí khai báo (VNĐ)</label>
                  <input type="number" name="declarationCost" id="declarationCost" value={costRequest.declarationCost} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="0" />
                </div>
                <div>
                  <label htmlFor="inspectionCost" className="block text-sm font-medium text-gray-700 mb-1">Phí kiểm hóa (VNĐ)</label>
                  <input type="number" name="inspectionCost" id="inspectionCost" value={costRequest.inspectionCost} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="0" />
                </div>
                <div>
                  <label htmlFor="infraCost" className="block text-sm font-medium text-gray-700 mb-1">Phí cơ sở hạ tầng (VNĐ)</label>
                  <input type="number" name="infraCost" id="infraCost" value={costRequest.infraCost} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="0" />
                </div>
                <div>
                  <label htmlFor="paymentOnBehalfCost" className="block text-sm font-medium text-gray-700 mb-1">Phí chi hộ (VNĐ)</label>
                  <input type="number" name="paymentOnBehalfCost" id="paymentOnBehalfCost" value={costRequest.paymentOnBehalfCost} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="0" />
                </div>
                 <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-gray-700 mb-1">Tổng tiền (VNĐ)</label>
                  <input type="number" name="totalAmount" id="totalAmount" value={costRequest.totalAmount} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md bg-gray-200" placeholder="Tổng tiền" readOnly />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea name="notes" id="notes" rows="3" value={costRequest.notes} onChange={handleCostRequestChange} className="w-full p-2 border border-gray-300 rounded-md" placeholder="Thêm ghi chú cho yêu cầu..."></textarea>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Gửi Yêu Cầu</button>
              </div>
            </form>
          </div>
        )}
      </div>
      <ReturnToHomeButton />
    </div>
  );
}
