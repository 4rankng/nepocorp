import React, { useState, useEffect, useCallback } from 'react';
import {
  getGeneralAccountantExpenses,
  addGeneralAccountantExpense,
  getVehiclesForSelect,
  getAvailableMonthsForGeneralExpensesReport,
  generalExpenseCategories,
  getTireExpenses,
  addTireExpense,
  getAggregatedCostsForAccountantChart,
} from '../../services/mockData';

// SVG Icons
const PlusIcon = ({ className = 'w-6 h-6' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

/*
Ideal data structure for a horizontal bar chart (e.g., for Chart.js):
const chartData = {
  labels: ['Phí gửi xe', 'Lương lái xe', 'Thay thế lốp xe', ...], // Categories
  datasets: [
    {
      label: 'Tổng chi phí (VNĐ)',
      data: [500000, 10000000, 2000000, ...], // Corresponding total amounts
      backgroundColor: 'rgba(54, 162, 235, 0.7)', // Example color for bars
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }
  ]
};
This structure allows for easy integration with charting libraries, where 'labels' typically
map to the Y-axis (for horizontal bars) and 'data' maps to the X-axis values.
The 'datasets' array can hold multiple sets of data for grouped or stacked charts,
but for this specific requirement, one dataset is sufficient.
*/

const initialGeneralExpenseFormState = {
  date: new Date().toISOString().split('T')[0],
  vehicleId: '',
  category: generalExpenseCategories[0] || '',
  customCategory: '',
  description: '',
  amount: '',
};

const initialTireExpenseFormState = {
  vehicleId: '',
  purchaseDate: new Date().toISOString().split('T')[0],
  replacementDate: '',
  brand: '',
  serialNumber: '',
  size: '',
  quantity: 1,
  unitPrice: '',
  supplier: '',
};

// Helper to format currency
const formatCurrency = value => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

// Helper to format date from YYYY-MM-DD to DD/MM/YYYY for display
const formatDateForDisplay = dateStr_YYYYMMDD => {
  if (!dateStr_YYYYMMDD) return '-';
  const [year, month, day] = dateStr_YYYYMMDD.split('-');
  return `${day}/${month}/${year}`;
};

const KeToanChiPhi = () => {
  // General Expenses State
  const [filters, setFilters] = useState({ vehicleId: '', monthYear: '' });
  const [expensesList, setExpensesList] = useState([]);
  const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
  const [newGeneralExpenseFormData, setNewGeneralExpenseFormData] = useState(
    initialGeneralExpenseFormState
  );

  // Tire Expenses State
  const [tireExpensesList, setTireExpensesList] = useState([]);
  const [isTireModalOpen, setIsTireModalOpen] = useState(false);
  const [newTireExpenseFormData, setNewTireExpenseFormData] = useState(initialTireExpenseFormState);
  const [tireVehicleFilter, setTireVehicleFilter] = useState('');

  // Chart Data State
  const [aggregatedChartData, setAggregatedChartData] = useState([]);
  const [isLoadingChartData, setIsLoadingChartData] = useState(false);
  const [maxChartBarValue, setMaxChartBarValue] = useState(0);

  // Shared State
  const [vehiclesForSelect, setVehiclesForSelect] = useState([]);
  const [monthsForSelect, setMonthsForSelect] = useState([]);

  const [isLoadingGeneralExpenses, setIsLoadingGeneralExpenses] = useState(false);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false);
  const [isLoadingTires, setIsLoadingTires] = useState(false);
  const [error, setError] = useState('');
  const [chartError, setChartError] = useState('');

  const fetchDropdownData = useCallback(async () => {
    setIsLoadingDropdowns(true);
    try {
      const [vehicles, months] = await Promise.all([
        getVehiclesForSelect(),
        getAvailableMonthsForGeneralExpensesReport(),
      ]);
      setVehiclesForSelect(vehicles);
      setMonthsForSelect(months);
    } catch (err) {
      setError('Không thể tải dữ liệu cho các mục chọn.');
      console.error(err);
    }
    setIsLoadingDropdowns(false);
  }, []);

  useEffect(() => {
    fetchDropdownData();
  }, [fetchDropdownData]);

  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleTireFilterChange = e => {
    setTireVehicleFilter(e.target.value);
  };

  const fetchDataBasedOnFilters = useCallback(async () => {
    // Fetch General Expenses
    setIsLoadingGeneralExpenses(true);
    setError('');
    setChartError('');
    try {
      const generalData = await getGeneralAccountantExpenses(filters);
      setExpensesList(generalData);
    } catch (err) {
      setError('Không thể tải danh sách chi phí chung.');
      console.error(err);
    }
    setIsLoadingGeneralExpenses(false);

    // Fetch Aggregated Chart Data
    setIsLoadingChartData(true);
    try {
      const chartData = await getAggregatedCostsForAccountantChart(filters);
      setAggregatedChartData(chartData);
      if (chartData.length > 0) {
        const maxVal = chartData.reduce((max, item) => Math.max(max, item.totalAmount), 0);
        setMaxChartBarValue(maxVal > 0 ? maxVal : 1);
      } else {
        setMaxChartBarValue(1);
      }
    } catch (err) {
      setChartError('Không thể tải dữ liệu biểu đồ chi phí.');
      console.error(err);
    }
    setIsLoadingChartData(false);
  }, [filters]);

  useEffect(() => {
    fetchDataBasedOnFilters();
  }, [fetchDataBasedOnFilters]);

  const fetchTireExpensesData = useCallback(async () => {
    setIsLoadingTires(true);
    // Not clearing main error here, as tire data is secondary for now
    try {
      const data = await getTireExpenses(tireVehicleFilter);
      setTireExpensesList(data);
    } catch (err) {
      console.error('Tire fetch error:', err);
    } finally {
      setIsLoadingTires(false);
    }
  }, [tireVehicleFilter]);

  useEffect(() => {
    fetchTireExpensesData();
  }, [fetchTireExpensesData]);

  // General Expense Modal Handlers
  const handleGeneralModalInputChange = e => {
    const { name, value } = e.target;
    setNewGeneralExpenseFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleOpenGeneralModal = () => {
    setNewGeneralExpenseFormData(initialGeneralExpenseFormState);
    setError('');
    setIsGeneralModalOpen(true);
  };
  const handleCloseGeneralModal = () => {
    setIsGeneralModalOpen(false);
    setError('');
  };
  const handleAddGeneralExpense = async () => {
    setError('');
    const expensePayload = {
      ...newGeneralExpenseFormData,
      category:
        newGeneralExpenseFormData.category === 'Khác'
          ? newGeneralExpenseFormData.customCategory.trim()
          : newGeneralExpenseFormData.category,
      amount: parseFloat(newGeneralExpenseFormData.amount),
    };
    if (newGeneralExpenseFormData.category !== 'Khác') delete expensePayload.customCategory;

    if (
      !expensePayload.date ||
      !expensePayload.category ||
      !expensePayload.description ||
      isNaN(expensePayload.amount) ||
      expensePayload.amount <= 0
    ) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc và số tiền hợp lệ cho chi phí chung.');
      return;
    }

    setIsLoadingGeneralExpenses(true); // Use general loading for this main action
    try {
      await addGeneralAccountantExpense(expensePayload);
      await fetchDataBasedOnFilters(); // Refresh both general expenses and chart
      handleCloseGeneralModal();
    } catch (err) {
      setError(`Lỗi khi thêm chi phí chung: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoadingGeneralExpenses(false);
    }
  };

  // Tire Expense Modal Handlers
  const handleTireModalInputChange = e => {
    const { name, value } = e.target;
    setNewTireExpenseFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleOpenTireModal = () => {
    setNewTireExpenseFormData(initialTireExpenseFormState);
    setError('');
    setIsTireModalOpen(true);
  };
  const handleCloseTireModal = () => {
    setIsTireModalOpen(false);
    setError('');
  };
  const handleAddTireExpense = async () => {
    setError('');
    const tirePayload = {
      ...newTireExpenseFormData,
      quantity: parseInt(newTireExpenseFormData.quantity, 10),
      unitPrice: parseFloat(newTireExpenseFormData.unitPrice),
    };

    if (
      !tirePayload.vehicleId ||
      !tirePayload.purchaseDate ||
      !tirePayload.brand ||
      !tirePayload.serialNumber ||
      !tirePayload.size ||
      isNaN(tirePayload.quantity) ||
      tirePayload.quantity <= 0 ||
      isNaN(tirePayload.unitPrice) ||
      tirePayload.unitPrice <= 0 ||
      !tirePayload.supplier
    ) {
      setError(
        'Vui lòng điền đầy đủ các trường bắt buộc cho chi phí lốp và đảm bảo số lượng, đơn giá hợp lệ.'
      );
      return;
    }

    setIsLoadingTires(true);
    try {
      await addTireExpense(tirePayload);
      await fetchTireExpensesData();
      await fetchDataBasedOnFilters(); // Refresh chart data as tire expenses are part of it
      handleCloseTireModal();
    } catch (err) {
      setError(`Lỗi khi thêm chi phí lốp: ${err.message}`);
      console.error(err);
    } finally {
      setIsLoadingTires(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-white min-h-screen">
      {' '}
      {/* Ensured white background */}
      {/* General Expenses Section Title and Add Button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-700">Quản Lý Chi Phí (Kế Toán)</h1>
      </div>
      {/* Filter Controls */}
      <div className="mb-6 p-4 bg-gray-50 shadow rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label
              htmlFor="vehicleIdFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lọc theo xe
            </label>
            <select
              id="vehicleIdFilter"
              name="vehicleId"
              value={filters.vehicleId}
              onChange={handleFilterChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={isLoadingDropdowns}
            >
              <option value="">Tất cả xe</option>
              {vehiclesForSelect.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="monthYearFilter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Lọc theo tháng
            </label>
            <select
              id="monthYearFilter"
              name="monthYear"
              value={filters.monthYear}
              onChange={handleFilterChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              disabled={isLoadingDropdowns}
            >
              <option value="">Tất cả tháng</option>
              {monthsForSelect.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      {/* Aggregated Costs Chart Section */}
      <div className="mb-8 p-4 bg-white shadow-sm border border-gray-200 rounded-lg">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Tổng Hợp Chi Phí Theo Hạng Mục</h2>
        {isLoadingChartData && (
          <div className="text-center text-gray-500 py-4">Đang tải biểu đồ...</div>
        )}
        {!isLoadingChartData && chartError && (
          <div className="text-center text-red-600 bg-red-50 p-3 rounded-md">{chartError}</div>
        )}
        {!isLoadingChartData && !chartError && aggregatedChartData.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Không có dữ liệu chi phí tổng hợp cho lựa chọn này.
          </div>
        )}
        {!isLoadingChartData && !chartError && aggregatedChartData.length > 0 && (
          <div className="space-y-3">
            {aggregatedChartData.map(item => (
              <div key={item.category} className="py-1 border-b border-gray-100 last:border-b-0">
                <div className="flex justify-between items-center text-sm mb-0.5">
                  <span className="font-medium text-gray-700 w-2/5 truncate" title={item.category}>
                    {item.category}
                  </span>
                  <span className="font-semibold text-gray-800 w-1/5 text-right">
                    {formatCurrency(item.totalAmount)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-5 border border-gray-300 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-l-full" // Use rounded-l-full for a more complete bar look
                    style={{
                      width: `${maxChartBarValue > 0 ? (item.totalAmount / maxChartBarValue) * 100 : 0}%`,
                    }}
                    title={`${item.category}: ${formatCurrency(item.totalAmount)}`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* General Expenses Section (Table and Add Button) */}
      <div className="flex justify-between items-center mb-4 mt-8 pt-4 border-t">
        <h2 className="text-xl md:text-2xl font-bold text-gray-700">Chi Tiết Chi Phí Chung</h2>
        <button
          onClick={handleOpenGeneralModal}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg shadow-md text-sm"
        >
          <PlusIcon className="w-5 h-5 mr-1" /> Thêm Chi Phí Chung
        </button>
      </div>
      {error && !isGeneralModalOpen && !isTireModalOpen && (
        <div className="mb-4 text-center text-red-500 bg-red-100 p-3 rounded-md">{error}</div>
      )}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto mb-10">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Biển Số Xe
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hạng Mục
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Diễn Giải
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Số Tiền
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoadingGeneralExpenses ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Đang tải chi phí chung...
                </td>
              </tr>
            ) : expensesList.length === 0 && !error ? (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Không có chi phí chung nào phù hợp.
                </td>
              </tr>
            ) : (
              expensesList.map(expense => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateForDisplay(expense.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.bienSoXe || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {expense.category}
                  </td>
                  <td
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-md truncate"
                    title={expense.description}
                  >
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(expense.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Tire Expenses Section */}
      <div className="mt-10 pt-6 border-t">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-700">Quản Lý Thay Thế Lốp Xe</h2>
          <button
            onClick={handleOpenTireModal}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-lg shadow-md text-sm"
          >
            <PlusIcon className="w-5 h-5 mr-1" /> Thêm Chi Tiết Lốp
          </button>
        </div>
        <div className="mb-6 p-4 bg-gray-50 shadow rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label
                htmlFor="tireVehicleFilter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Lọc theo xe (Lốp xe)
              </label>
              <select
                id="tireVehicleFilter"
                name="tireVehicleFilter"
                value={tireVehicleFilter}
                onChange={handleTireFilterChange}
                className="mt-1 block w-full select-style"
                disabled={isLoadingDropdowns}
              >
                <option value="">Tất cả xe</option>
                {vehiclesForSelect.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày Mua
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Biển Số Xe
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhãn Hiệu
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số Series
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cỡ Lốp
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số Lượng
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đơn Giá
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thành Tiền
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhà Cung Cấp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày Thay
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tuổi Thọ (ngày)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoadingTires ? (
                <tr>
                  <td colSpan="11" className="p-4 text-center text-gray-500">
                    Đang tải chi phí lốp...
                  </td>
                </tr>
              ) : tireExpensesList.length === 0 &&
                !chartError &&
                !error &&
                !isLoadingGeneralExpenses ? (
                <tr>
                  <td colSpan="11" className="p-4 text-center text-gray-500">
                    Không có chi phí lốp nào.
                  </td>
                </tr>
              ) : (
                tireExpensesList.map(tire => (
                  <tr key={tire.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {formatDateForDisplay(tire.purchaseDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{tire.bienSoXe}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{tire.brand}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{tire.serialNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{tire.size}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {tire.quantity}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrency(tire.unitPrice)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrency(tire.totalPrice)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{tire.supplier}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {formatDateForDisplay(tire.replacementDate) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {tire.tireAgeInDays}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add General Expense Modal */}
      {isGeneralModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Thêm Chi Phí Mới</h2>
            {error && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}
            <form className="space-y-4 flex-grow overflow-y-auto pr-2">
              {/* ... form fields from previous version ... */}
            </form>
            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCloseGeneralModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddGeneralExpense}
                disabled={isLoadingGeneralExpenses}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${isLoadingGeneralExpenses ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isLoadingGeneralExpenses ? 'Đang lưu...' : 'Lưu Chi Phí'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Add Tire Expense Modal */}
      {isTireModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Thêm Chi Tiết Lốp Xe</h2>
            {error && <p className="text-red-500 text-sm mb-3 bg-red-100 p-2 rounded">{error}</p>}
            <form className="space-y-3 flex-grow overflow-y-auto pr-2">
              {/* ... form fields from previous version ... */}
            </form>
            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCloseTireModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddTireExpense}
                disabled={isLoadingTires}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${isLoadingTires ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isLoadingTires ? 'Đang lưu...' : 'Lưu Chi Tiết Lốp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeToanChiPhi;
