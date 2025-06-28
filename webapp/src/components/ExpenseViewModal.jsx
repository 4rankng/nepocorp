import React, { useState, useEffect, useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { expenseApi } from '@services/api/expenseApi';
import { expenseCategoryApi } from '@services/api/expenseCategoryApi';
import { settingsApi } from '@services/api/settingsApi';
import { PAYMENT_STATUS, PAYMENT_STATUS_LABELS } from '@constants/payment';
import Dropdown from '@components/ui/Dropdown';
import { VehicleDataContext } from '@/contexts/VehicleDataContext';
import LicensePlateSelectionModal from './LicensePlateSelectionModal';

// Utility functions
const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN').format(value);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('vi-VN');
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'PAID':
      return '#10b981';
    case 'PENDING':
      return '#f59e0b';
    case 'DRAFT':
      return '#6b7280';
    case 'CANCELLED':
      return '#ef4444';
    default:
      return '#6b7280';
  }
};

const ExpenseViewModal = ({ open, onClose, expenseId }) => {
  const { tractors, trailers, fetchTractors, fetchTrailers } = useContext(VehicleDataContext);
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [isLoadingPlates, setIsLoadingPlates] = useState(false);
  const [showLicensePlateModal, setShowLicensePlateModal] = useState(false);
  const [currentLicensePlateIndex, setCurrentLicensePlateIndex] = useState(null);

  // Get license plates for dropdown
  const getAllLicensePlates = useCallback(() => {
    const tractorPlates = tractors.map(t => ({
      value: t.license_plate,
      label: `${t.license_plate} (Đầu kéo)`,
      type: 'tractor'
    }));

    const trailerPlates = trailers.map(t => ({
      value: t.license_plate,
      label: `${t.license_plate} (Rơ moóc)`,
      type: 'trailer'
    }));

    return [...tractorPlates, ...trailerPlates];
  }, [tractors, trailers]);

  const fetchExpenseData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await expenseApi.getById(expenseId);
      const expenseData = response.data?.data || response.data || response;

      // Ensure items is always an array
      if (expenseData && !Array.isArray(expenseData.items)) {
        expenseData.items = expenseData.items ? [expenseData.items] : [];
      }

      setExpenseData(expenseData);
    } catch (err) {
      setError('Không thể tải thông tin hóa đơn');
      console.error('Error fetching expense data:', err);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  useEffect(() => {
    if (open && expenseId) {
      fetchExpenseData();
    }
  }, [open, expenseId, fetchExpenseData]);

  // Load tax rate when modal opens
  useEffect(() => {
    const loadTaxRate = async () => {
      if (!open) return;

      // Check localStorage first
      const cachedTaxRate = localStorage.getItem('taxRate');
      if (cachedTaxRate) {
        setTaxRate(parseFloat(cachedTaxRate));
      } else {
        try {
          const response = await settingsApi.getTaxRate();
          const rate = parseFloat(response.value);
          setTaxRate(rate);
          localStorage.setItem('taxRate', rate.toString());
        } catch (error) {
          console.warn('Failed to load tax rate:', error);
          setTaxRate(10);
        }
      }
    };

    loadTaxRate();
  }, [open]);

  // Fetch expense categories and vehicles when entering edit mode
  useEffect(() => {
    const fetchCategories = async () => {
      if (isEditing && expenseCategories.length === 0) {
        setIsLoadingCategories(true);
        try {
          const response = await expenseCategoryApi.getAll();
          const categories = response.data?.data || response.data || [];
          setExpenseCategories(categories);
        } catch (err) {
          console.error('Error fetching expense categories:', err);
        } finally {
          setIsLoadingCategories(false);
        }
      }
    };

    const fetchVehicles = async () => {
      if (isEditing && (tractors.length === 0 || trailers.length === 0)) {
        setIsLoadingPlates(true);
        try {
          await Promise.all([
            fetchTractors(),
            fetchTrailers()
          ]);
        } catch (err) {
          console.error('Error fetching vehicles:', err);
        } finally {
          setIsLoadingPlates(false);
        }
      }
    };

    fetchCategories();
    fetchVehicles();
  }, [isEditing, expenseCategories.length, tractors.length, trailers.length, fetchTractors, fetchTrailers]);

  const handleClose = useCallback(() => {
    setExpenseData(null);
    setError(null);
    setIsEditing(false);
    setEditedData(null);
    onClose();
  }, [onClose]);

  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    setEditedData({
      ...expenseData,
      items: expenseData.items.map(item => ({ ...item }))
    });
  }, [expenseData]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedData(null);
  }, []);

  // Handle ESC key to close modal or cancel editing
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open && !showLicensePlateModal) {
        if (isEditing) {
          handleCancelEdit();
        } else {
          handleClose();
        }
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, isEditing, handleCancelEdit, handleClose, showLicensePlateModal]);

  const handleSaveEdit = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Calculate totals for items
      const updatedItems = editedData.items.map(item => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const taxRate = parseFloat(item.tax_rate) || 0;
        const subtotal = price * quantity;
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount;

        return {
          ...item,
          price,
          quantity,
          tax_rate: taxRate,
          total
        };
      });

      const totalAmount = updatedItems.reduce((sum, item) => sum + item.total, 0);

      const updateData = {
        vendor_name: editedData.vendor_name,
        expense_category_id: editedData.expense_category_id,
        payment_status: editedData.payment_status,
        payment_proof: editedData.payment_proof || null,
        cancel_reason: editedData.cancel_reason || null,
        remark: editedData.remark,
        items: updatedItems,
        total: totalAmount
      };

      await expenseApi.update(expenseId, updateData);

      // Refresh the expense data
      await fetchExpenseData();
      setIsEditing(false);
      setEditedData(null);
    } catch (err) {
      setError('Không thể cập nhật phiếu chi');
      console.error('Error updating expense:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedData, expenseId, fetchExpenseData]);

  const handleFieldChange = useCallback((field, value) => {
    setEditedData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  const handleAddItem = useCallback(() => {
    setEditedData(prev => ({
      ...prev,
      items: [...prev.items, {
        license_plate: '',
        item_name: '',
        install_date: null,
        expiry_date: null,
        price: 0,
        quantity: 1,
        tax_rate: taxRate,
        total: 0
      }]
    }));
  }, [taxRate]);

  const handleDeleteItem = useCallback((index) => {
    setEditedData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  }, []);

  const handleLicensePlateCellClick = useCallback((index) => {
    setCurrentLicensePlateIndex(index);
    setShowLicensePlateModal(true);
  }, []);

  const handleLicensePlateSelect = useCallback((selectedPlate) => {
    if (currentLicensePlateIndex !== null) {
      setEditedData(prev => {
        const updatedItems = prev.items.map((item, i) => {
          if (i === currentLicensePlateIndex) {
            return { ...item, license_plate: selectedPlate };
          }
          return item;
        });

        // Prefill other empty license plate cells
        const prefilledItems = updatedItems.map(item => {
          if (!item.license_plate) {
            return { ...item, license_plate: selectedPlate };
          }
          return item;
        });

        return { ...prev, items: prefilledItems };
      });
      setCurrentLicensePlateIndex(null);
    }
    setShowLicensePlateModal(false);
  }, [currentLicensePlateIndex]);


  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-900">Chi tiết phiếu chi</h1>
            {expenseData && !loading && (
              <>
                {isEditing ? (
                  <Dropdown
                    value={editedData.payment_status}
                    onChange={(value) => handleFieldChange('payment_status', value)}
                    options={Object.entries(PAYMENT_STATUS).map(([key, value]) => ({
                      value: value,
                      label: PAYMENT_STATUS_LABELS[value]
                    }))}
                    placeholder="Chọn trạng thái"
                    className="text-xs"
                    style={{ minWidth: '120px' }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        border: `1px solid ${getPaymentStatusColor(expenseData.payment_status)}`,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: getPaymentStatusColor(expenseData.payment_status),
                        backgroundColor: `${getPaymentStatusColor(expenseData.payment_status)}15`,
                        minWidth: '80px',
                        textAlign: 'center',
                      }}
                    >
                      {PAYMENT_STATUS_LABELS[expenseData.payment_status] || expenseData.payment_status}
                    </span>
                    {expenseData.payment_status === 'PAID' && (
                      expenseData.payment_proof ? (
                        <button
                          onClick={() => window.open(expenseData.payment_proof, '_blank')}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                          title="Xem chứng từ thanh toán"
                        >
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                          <span>Xem chứng từ</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-400 text-xs font-medium rounded cursor-not-allowed"
                          title="Chưa có chứng từ"
                        >
                          <OpenInNewIcon sx={{ fontSize: 14 }} />
                          <span>Chưa có chứng từ</span>
                        </button>
                      )
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
<CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm mb-4">
              {error}
            </div>
          )}

          {expenseData && !loading && (
            <>
              {/* Basic Information Section */}
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Thông tin cơ bản</h2>
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-10">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nhà cung cấp
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editedData.vendor_name || ''}
                        onChange={(e) => handleFieldChange('vendor_name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Nhập tên nhà cung cấp"
                      />
                    ) : (
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                        {expenseData.vendor_name || '-'}
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Loại chi phí
                    </label>
                    {isEditing ? (
                      <Dropdown
                        value={editedData.expense_category_id}
                        onChange={(value) => handleFieldChange('expense_category_id', value)}
                        options={expenseCategories.map(cat => ({
                          value: cat.id,
                          label: cat.name
                        }))}
                        placeholder="Chọn loại chi phí"
                        isLoading={isLoadingCategories}
                        className="text-sm"
                      />
                    ) : (
                      <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-gray-50">
                        {expenseData.expense_category?.name || '-'}
                      </div>
                    )}
                  </div>


                </div>
              </div>

              {/* Remark Section */}
              {(expenseData.remark || isEditing) && (
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">Ghi chú</h2>
                  {isEditing ? (
                    <textarea
                      value={editedData.remark || ''}
                      onChange={(e) => handleFieldChange('remark', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Nhập ghi chú"
                      rows="1"
                    />
                  ) : (
                    <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-blue-50 text-blue-700">
                      {expenseData.remark}
                    </div>
                  )}
                </div>
              )}

              {/* Cancel Reason Section */}
              {((isEditing ? editedData.payment_status === 'CANCELLED' : expenseData.payment_status === 'CANCELLED') ||
                (expenseData.cancel_reason && !isEditing)) && (
                <div className="mb-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Lý do hủy
                      </label>
                      {isEditing && editedData.payment_status === 'CANCELLED' ? (
                        <textarea
                          value={editedData.cancel_reason || ''}
                          onChange={(e) => handleFieldChange('cancel_reason', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Nhập lý do hủy"
                          rows="2"
                        />
                      ) : (
                        <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-red-50 text-red-700">
                          {expenseData.cancel_reason || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Proof Section */}
              {((isEditing && editedData.payment_status === 'PAID') ||
                (!isEditing && expenseData.payment_proof)) && (
                <div className="mb-4">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-8">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        URL chứng từ thanh toán
                      </label>
                      {isEditing && editedData.payment_status === 'PAID' ? (
                        <input
                          type="url"
                          value={editedData.payment_proof || ''}
                          onChange={(e) => handleFieldChange('payment_proof', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="https://example.com/payment-proof"
                        />
                      ) : (
                        <div className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-green-50 text-green-700">
                          {expenseData.payment_proof || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* Items Section */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Danh sách hạng mục</h2>

                {/* Compact Table - Exact same styling as demo */}
                <div className="border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Biển số xe</th>
                        <th className="text-left px-3 py-2 text-xs font-medium text-gray-700 border-r">Hạng mục</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày lắp đặt</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r">Ngày hết hạn</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r">Đơn giá (VND)</th>
                        <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 border-r w-16">SL</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700 border-r w-20">Thuế (%)</th>
                        <th className="text-right px-3 py-2 text-xs font-medium text-gray-700">Thành tiền</th>
                        {isEditing && (
                          <th className="text-center px-3 py-2 text-xs font-medium text-gray-700 w-20">Thao tác</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {(isEditing ? editedData.items : expenseData.items) && (isEditing ? editedData.items : expenseData.items).length > 0 ? (
                        (isEditing ? editedData.items : expenseData.items).map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50 border-t">
                            <td className="px-3 py-2 text-xs border-r">
                              {isEditing ? (
                                <div
                                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded -ml-1 -my-1"
                                  onClick={() => handleLicensePlateCellClick(index)}
                                  style={{ minWidth: '150px' }}
                                >
                                  <span>{item.license_plate || <span className="text-gray-400">Chọn biển số</span>}</span>
                                  <EditIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                                </div>
                              ) : (
                                item.license_plate || '-'
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs border-r">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={item.item_name || ''}
                                  onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                />
                              ) : (
                                item.item_name || '-'
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-center border-r">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={item.install_date ? item.install_date.split('T')[0] : ''}
                                  onChange={(e) => handleItemChange(index, 'install_date', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                />
                              ) : (
                                formatDate(item.install_date)
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-center border-r">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={item.expiry_date ? item.expiry_date.split('T')[0] : ''}
                                  onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none"
                                />
                              ) : (
                                formatDate(item.expiry_date)
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-right border-r">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={item.price || ''}
                                  onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-right"
                                  min="0"
                                />
                              ) : (
                                formatCurrency(item.price || 0)
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-center border-r">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={item.quantity || ''}
                                  onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-center"
                                  min="1"
                                />
                              ) : (
                                item.quantity || 0
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-right border-r">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={item.tax_rate || ''}
                                  onChange={(e) => handleItemChange(index, 'tax_rate', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-right"
                                  min="0"
                                  max="100"
                                />
                              ) : (
                                `${item.tax_rate || 0}%`
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-right font-medium">
                              {formatCurrency(
                                isEditing
                                  ? ((parseFloat(item.price) || 0) * (parseFloat(item.quantity) || 0) * (1 + (parseFloat(item.tax_rate) || 0) / 100))
                                  : (item.total || 0)
                              )}
                            </td>
                            {isEditing && (
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => handleDeleteItem(index)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Xóa hạng mục"
                                >
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={isEditing ? "9" : "8"} className="px-3 py-6 text-center text-gray-500 text-xs">
                            Không có dữ liệu hạng mục
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {((isEditing ? editedData.items : expenseData.items) || []).length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50 font-medium border-t">
                          <td colSpan={isEditing ? "8" : "7"} className="px-3 py-2 text-right text-xs">Tổng cộng:</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap">
                            {formatCurrency(
                              isEditing
                                ? editedData.items.reduce((sum, item) => {
                                    const price = parseFloat(item.price) || 0;
                                    const quantity = parseFloat(item.quantity) || 0;
                                    const taxRate = parseFloat(item.tax_rate) || 0;
                                    return sum + (price * quantity * (1 + taxRate / 100));
                                  }, 0)
                                : (expenseData.total || 0)
                            )} ₫
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
          {isEditing ? (
            <>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <AddIcon sx={{ fontSize: 16 }} />
                <span>Thêm hạng mục</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end gap-2 w-full">
              <button
                onClick={handleClose}
                className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
              {expenseData && (
                <button
                  onClick={handleEditClick}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                >
                  <EditIcon sx={{ fontSize: 16 }} />
                  <span>Sửa</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <LicensePlateSelectionModal
        open={showLicensePlateModal}
        onClose={() => setShowLicensePlateModal(false)}
        onSelect={handleLicensePlateSelect}
        licensePlates={getAllLicensePlates()}
        isLoading={isLoadingPlates}
      />
    </div>
  );
};

ExpenseViewModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  expenseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default React.memo(ExpenseViewModal);
