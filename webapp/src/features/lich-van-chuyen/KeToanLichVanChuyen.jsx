import React, { useState, useEffect, useCallback } from 'react';
import {
  getShipmentPlans,
  updateShipmentPlanField,
<<<<<<< HEAD
  addDetailedOtherCostItem,
  updateDetailedOtherCostItem,
  deleteDetailedOtherCostItem,
=======
  addShipmentPlan, // Import addShipmentPlan
  getVehiclesForSelect,
  getPartnersForSelect,
  getCustomersForSelect,
  getContainerTypesForSelect,
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
} from '../../services/mockData';
import ShipmentPlanFormModal from './components/ShipmentPlanFormModal'; // Import the new modal

<<<<<<< HEAD
// SVG Icons
const PlusCircleIcon = ({ className = 'w-5 h-5' }) => (
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
      d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const EditIcon = (
  { className = 'w-4 h-4' } // Smaller for modal list
) => (
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
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
    />
  </svg>
);
const DeleteIcon = (
  { className = 'w-4 h-4' } // Smaller for modal list
) => (
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
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
    />
  </svg>
);
const PencilIcon = (
  { className = 'w-5 h-5' } // Main table edit icon
) => (
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
      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
    />
  </svg>
);
=======
// SVG Icons (PlusCircleIcon already used, others might be needed by modal or main page)
const PlusCircleIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)

// Helper to format currency
const formatCurrency = value => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

const formatDateForDisplay = dateStr_DDMMYYYY => {
  if (!dateStr_DDMMYYYY) return '-';
  return dateStr_DDMMYYYY;
};

const KeToanLichVanChuyen = () => {
  const [shipmentPlans, setShipmentPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // For main page errors

  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  // State for the new plan modal
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectOptions, setSelectOptions] = useState({
    vehicles: [],
    partners: [],
    customers: [],
    containerTypes: [],
  });
  const [isLoadingSelectOptions, setIsLoadingSelectOptions] = useState(false);
  const [modalError, setModalError] = useState(''); // For modal specific errors


  const fetchShipmentPlansData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getShipmentPlans();
      setShipmentPlans(data);
    } catch (err) {
      setError('Không thể tải danh sách lịch vận chuyển.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSelectOptionsData = useCallback(async () => {
    setIsLoadingSelectOptions(true);
    try {
      const [vehicles, partners, customers, containerTypes] = await Promise.all([
        getVehiclesForSelect(),
        getPartnersForSelect(),
        getCustomersForSelect(),
        getContainerTypesForSelect(),
      ]);
      setSelectOptions({ vehicles, partners, customers, containerTypes });
    } catch (err) {
      setError('Không thể tải dữ liệu cho form lựa chọn.'); // Can use a more specific error state if needed
      console.error(err);
    } finally {
      setIsLoadingSelectOptions(false);
    }
  }, []);


  useEffect(() => {
    fetchShipmentPlansData();
    fetchSelectOptionsData(); // Fetch options needed for the modal
  }, [fetchShipmentPlansData, fetchSelectOptionsData]);


  const handleCellClick = (plan, field) => {
    setEditingCell({ planId: plan.id, field });
    let currentValue = plan[field];
    if (field === 'donGiaDau' && plan[field] === 0 && plan.dauLit > 0 && plan.dauDong > 0) {
      currentValue = plan.dauDong / plan.dauLit;
    }
    setEditValue(String(currentValue || 0));
  };

  const handleEditInputChange = e => {
    setEditValue(e.target.value);
  };

  const handleEditCommit = async () => {
    if (!editingCell) return;
    const { planId, field } = editingCell;
    const numericValue = parseFloat(editValue);
    if (isNaN(numericValue)) {
      setError(`Giá trị nhập cho ${field} không hợp lệ.`);
      return;
    }
    // For optimistic update, you might need to set isLoading state for the specific row/cell
    try {
      await updateShipmentPlanField(planId, field, numericValue);
      await fetchShipmentPlansData();
      setError('');
    } catch (err) {
      setError(`Lỗi khi cập nhật: ${err.message}`);
      console.error(err);
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleEditKeyDown = e => {
    if (e.key === 'Enter') handleEditCommit();
    else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const renderEditableCell = (plan, fieldKey, displayValue, isCurrency = false) => {
    if (editingCell && editingCell.planId === plan.id && editingCell.field === fieldKey) {
      return (
        <input
          type="number"
          value={editValue}
          onChange={handleEditInputChange}
          onBlur={handleEditCommit}
          onKeyDown={handleEditKeyDown}
          className="w-full px-1 py-0.5 border border-blue-500 rounded-sm text-sm text-right"
          autoFocus
          min="0"
        />
      );
    }
    return isCurrency ? formatCurrency(displayValue) : displayValue || 0;
  };

<<<<<<< HEAD
  // --- Other Costs Modal Functions ---
  const openOtherCostsModal = plan => {
    setSelectedPlanForOtherCosts(plan);
    // Deep copy to avoid mutating original plan's detailedOtherCosts directly in modal state
    setModalDetailedCosts(
      plan.detailedOtherCosts ? JSON.parse(JSON.stringify(plan.detailedOtherCosts)) : []
    );
    setNewCostItemName('');
    setNewCostItemAmount('');
    setEditingCostItemId(null);
    setIsOtherCostsModalOpen(true);
=======
  // --- New Plan Modal Handlers ---
  const handleOpenAddNewPlanModal = () => {
    setModalError(''); // Clear previous modal errors
    setIsPlanModalOpen(true);
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
  };

  const handleCloseAddNewPlanModal = () => {
    setIsPlanModalOpen(false);
    setModalError('');
  };

<<<<<<< HEAD
  const handleModalCostItemChange = (index, field, value) => {
    const updatedCosts = [...modalDetailedCosts];
    updatedCosts[index] = {
      ...updatedCosts[index],
      [field]: field === 'amount' ? parseFloat(value) || 0 : value,
    };
    setModalDetailedCosts(updatedCosts);
  };

  const handleAddOrUpdateModalCostItem = () => {
    if (
      !newCostItemName.trim() ||
      !newCostItemAmount.trim() ||
      parseFloat(newCostItemAmount) <= 0
    ) {
      setError('Tên và số tiền hợp lệ là bắt buộc cho khoản chi.');
      return;
    }
    const amount = parseFloat(newCostItemAmount);
    if (editingCostItemId) {
      // Update existing item in modal
      setModalDetailedCosts(
        modalDetailedCosts.map(item =>
          item.id === editingCostItemId ? { ...item, name: newCostItemName.trim(), amount } : item
        )
      );
    } else {
      // Add new item to modal
      setModalDetailedCosts([
        ...modalDetailedCosts,
        { id: `temp-${Date.now()}`, name: newCostItemName.trim(), amount },
      ]);
    }
    setNewCostItemName('');
    setNewCostItemAmount('');
    setEditingCostItemId(null);
    setError('');
  };

  const handleEditModalCostItem = item => {
    setEditingCostItemId(item.id);
    setNewCostItemName(item.name);
    setNewCostItemAmount(String(item.amount));
  };

  const handleDeleteModalCostItem = itemId => {
    setModalDetailedCosts(modalDetailedCosts.filter(item => item.id !== itemId));
  };

  const handleSaveOtherCosts = async () => {
    if (!selectedPlanForOtherCosts) return;
    setIsLoading(true);
    setError('');
    try {
      // Compare initial detailedOtherCosts with modalDetailedCosts to find changes
      const originalCosts = selectedPlanForOtherCosts.detailedOtherCosts || [];
      const itemsToAdd = modalDetailedCosts.filter(
        item =>
          (!item.id.startsWith('temp-') && !originalCosts.find(oc => oc.id === item.id)) ||
          item.id.startsWith('temp-')
      ); // New items (temp or new from DB if IDs were fetched)
      const itemsToUpdate = modalDetailedCosts.filter(
        item =>
          !item.id.startsWith('temp-') &&
          originalCosts.find(
            oc => oc.id === item.id && (oc.name !== item.name || oc.amount !== item.amount)
          )
      );
      const itemsToDelete = originalCosts.filter(
        oc => !modalDetailedCosts.find(item => item.id === oc.id)
      );

      for (const item of itemsToDelete) {
        await deleteDetailedOtherCostItem(selectedPlanForOtherCosts.id, item.id);
      }
      for (const item of itemsToUpdate) {
        await updateDetailedOtherCostItem(
          selectedPlanForOtherCosts.id,
          item.id,
          item.name,
          item.amount
        );
      }
      for (const item of itemsToAdd) {
        // Items with temp-id are definitely new
        await addDetailedOtherCostItem(selectedPlanForOtherCosts.id, item.name, item.amount);
      }

      await fetchShipmentPlansData(); // Refresh main table
      closeOtherCostsModal();
=======
  const handleSaveNewPlan = async (planDataFromModal) => {
    setModalError('');
    setIsLoading(true); // Use main isLoading or a specific one for modal save
    try {
      // The planDataFromModal already has fields processed by ShipmentPlanFormModal
      // Ensure `trangThai: 'Nháp'` is set, which is done by initialPlanData prop
      await addShipmentPlan(planDataFromModal);
      await fetchShipmentPlansData(); // Refresh the main list
      handleCloseAddNewPlanModal();
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
    } catch (err) {
      setModalError(err.message || "Lỗi khi thêm kế hoạch vận chuyển mới.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 min-h-screen"> {/* Further removed bg-gray-100, ensuring it's white by parent */}
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
          Sổ Kế Toán - Lịch Vận Chuyển
        </h1>
<<<<<<< HEAD
        <button onClick={handleAddNewPlan} /* ... */> {/* ... */} </button>
      </div>

      {/* Error display for main page */}
      {error && !isOtherCostsModalOpen && (
        <div className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>
      )}

      {/* Main Table ... */}
      {!isLoading && !error && shipmentPlans.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... table head ... */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày tháng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biển số xe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đối tác
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Diễn giải
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tuyến đường
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số km (Hàng)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số km (Rỗng)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dầu (lít)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đơn giá dầu
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dầu (Đồng)
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ĐM Đi đường
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chi phí khác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipmentPlans.map(plan => (
                <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                  {/* ... other cells ... */}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {formatDateForDisplay(plan.ngayThang)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {plan.bienSoXe}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {plan.tenDoiTac || '-'}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate"
                    title={plan.dienGiai}
                  >
                    {plan.dienGiai}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate"
                    title={
                      typeof plan.tuyenDuong === 'object'
                        ? `${plan.tuyenDuong.diemDi} - ${Array.isArray(plan.tuyenDuong.diemDen) ? plan.tuyenDuong.diemDen.join(', ') : plan.tuyenDuong.diemDen}`
                        : plan.tuyenDuong
                    }
                  >
                    {typeof plan.tuyenDuong === 'object'
                      ? `${plan.tuyenDuong.diemDi} - ${Array.isArray(plan.tuyenDuong.diemDen) ? plan.tuyenDuong.diemDen.join(', ') : plan.tuyenDuong.diemDen}`
                      : plan.tuyenDuong}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {plan.trangThai}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right"
                    onClick={() => handleCellClick(plan, 'kmChuyenHang')}
                  >
                    {renderEditableCell(plan, 'kmChuyenHang', plan.kmChuyenHang)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right"
                    onClick={() => handleCellClick(plan, 'kmChuyenVoRong')}
                  >
                    {renderEditableCell(plan, 'kmChuyenVoRong', plan.kmChuyenVoRong)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right"
                    onClick={() => handleCellClick(plan, 'dauLit')}
                  >
                    {renderEditableCell(plan, 'dauLit', plan.dauLit)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right"
                    onClick={() => handleCellClick(plan, 'donGiaDau')}
                  >
                    {renderEditableCell(plan, 'donGiaDau', plan.donGiaDau, true)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(plan.dauDong)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(plan.dinhMucDiDuong || 0)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer text-right"
                    onClick={() => openOtherCostsModal(plan)}
                  >
                    {formatCurrency(plan.chiPhiKhac || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Other Costs Modal */}
      {isOtherCostsModalOpen && selectedPlanForOtherCosts && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              Chi Tiết Chi Phí Khác cho:{' '}
              <span className="font-normal">
                {selectedPlanForOtherCosts.dienGiai} ({selectedPlanForOtherCosts.ngayThang})
              </span>
            </h2>

            {/* Error display for modal */}
            {error && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}

            <div className="flex-grow overflow-y-auto pr-2">
              {modalDetailedCosts.length === 0 && (
                <p className="text-gray-500 text-sm">Chưa có khoản chi phí khác nào.</p>
              )}
              {modalDetailedCosts.map((item, index) => (
                <div
                  key={item.id || `new-${index}`}
                  className="flex items-center space-x-2 py-2 border-b last:border-b-0"
                >
                  {editingCostItemId === item.id ? (
                    <>
                      <input
                        type="text"
                        value={newCostItemName}
                        onChange={e => setNewCostItemName(e.target.value)}
                        placeholder="Tên khoản chi"
                        className="flex-grow input-style text-sm p-1"
                      />
                      <input
                        type="number"
                        value={newCostItemAmount}
                        onChange={e => setNewCostItemAmount(e.target.value)}
                        placeholder="Số tiền"
                        className="w-32 input-style text-sm p-1"
                      />
                    </>
                  ) : (
                    <>
                      <span className="flex-grow text-sm text-gray-700">{item.name}</span>
                      <span className="w-32 text-sm text-gray-700 text-right">
                        {formatCurrency(item.amount)}
                      </span>
                    </>
                  )}
                  {editingCostItemId === item.id ? (
                    <button
                      onClick={handleAddOrUpdateModalCostItem}
                      className="text-green-500 hover:text-green-700 p-1"
                    >
                      <PlusCircleIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEditModalCostItem(item)}
                      className="text-blue-500 hover:text-blue-700 p-1"
                    >
                      <EditIcon />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteModalCostItem(item.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <h3 className="text-md font-semibold mb-2 text-gray-700">
                {editingCostItemId ? 'Cập nhật Khoản Chi' : 'Thêm Khoản Chi Mới'}
              </h3>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="text"
                  value={newCostItemName}
                  onChange={e => setNewCostItemName(e.target.value)}
                  placeholder="Tên khoản chi"
                  className="flex-grow input-style p-2"
                />
                <input
                  type="number"
                  value={newCostItemAmount}
                  onChange={e => setNewCostItemAmount(e.target.value)}
                  placeholder="Số tiền"
                  className="w-40 input-style p-2"
                />
                <button
                  onClick={handleAddOrUpdateModalCostItem}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm"
                >
                  {editingCostItemId ? 'Cập nhật' : 'Thêm'}
                </button>
                {editingCostItemId && (
                  <button
                    onClick={() => {
                      setEditingCostItemId(null);
                      setNewCostItemName('');
                      setNewCostItemAmount('');
                    }}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Hủy Sửa
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={closeOtherCostsModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveOtherCosts}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${isLoading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
=======
        <button
          onClick={handleOpenAddNewPlanModal}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-md transition-colors duration-150"
        >
          <PlusCircleIcon className="mr-2" />
          Thêm Kế Hoạch
        </button>
      </div>

      {error && <div className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>}
      
      <div className="bg-white shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tháng</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biển số xe</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đối tác</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diễn giải</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tuyến đường</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số km (Hàng)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Số km (Rỗng)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dầu (lít)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá dầu</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dầu (Đồng)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ĐM Đi đường</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chi phí khác</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && shipmentPlans.length === 0 && (
              <tr><td colSpan="13" className="p-4 text-center text-gray-500">Đang tải dữ liệu...</td></tr>
            )}
            {!isLoading && !error && shipmentPlans.length === 0 && (
              <tr><td colSpan="13" className="p-4 text-center text-gray-500">Chưa có lịch vận chuyển nào.</td></tr>
            )}
            {shipmentPlans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDateForDisplay(plan.ngayThang)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{plan.bienSoXe}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{plan.tenDoiTac || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={plan.dienGiai}>{plan.dienGiai}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={typeof plan.tuyenDuong === 'object' ? `${plan.tuyenDuong.diemDi} - ${Array.isArray(plan.tuyenDuong.diemDen) ? plan.tuyenDuong.diemDen.join(', ') : plan.tuyenDuong.diemDen}` : plan.tuyenDuong}>
                    {typeof plan.tuyenDuong === 'object' ? `${plan.tuyenDuong.diemDi} - ${Array.isArray(plan.tuyenDuong.diemDen) ? plan.tuyenDuong.diemDen.join(', ') : plan.tuyenDuong.diemDen}` : plan.tuyenDuong}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{plan.trangThai}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right" onClick={() => handleCellClick(plan, 'kmChuyenHang')}>{renderEditableCell(plan, 'kmChuyenHang', plan.kmChuyenHang)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right" onClick={() => handleCellClick(plan, 'kmChuyenVoRong')}>{renderEditableCell(plan, 'kmChuyenVoRong', plan.kmChuyenVoRong)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right" onClick={() => handleCellClick(plan, 'dauLit')}>{renderEditableCell(plan, 'dauLit', plan.dauLit)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right" onClick={() => handleCellClick(plan, 'donGiaDau')}>{renderEditableCell(plan, 'donGiaDau', plan.donGiaDau, true)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(plan.dauDong)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(plan.dinhMucDiDuong || 0)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatCurrency(plan.chiPhiKhac || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPlanModalOpen && (
        <ShipmentPlanFormModal
          isOpen={isPlanModalOpen}
          onClose={handleCloseAddNewPlanModal}
          onSave={handleSaveNewPlan}
          initialPlanData={{ trangThai: 'Nháp', ngayThang: new Date().toISOString().split('T')[0], thongTinContainer: [{ soContainer: '', soSeal: '' }] }}
          editingPlan={null} // This modal instance is only for adding new
          selectOptions={selectOptions}
          isLoading={isLoading || isLoadingSelectOptions} // Pass loading state for save button
          error={modalError} // Pass modal-specific error state
        />
      )}
>>>>>>> b196d40 (feat: Refine chart simulations and suggest libraries)
    </div>
  );
};

export default KeToanLichVanChuyen;
