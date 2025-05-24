import React, { useState, useEffect } from 'react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from '@services/mockData';
import { PlusIcon, PencilIcon, TrashIcon } from '@assets/icons/index.jsx';
import ConfirmationModal from '../../components/ConfirmationModal';

const initialFormState = {
  code: '',
  name: '',
  address: '',
  taxCode: '',
};

const QuanLyKhachHang = () => {
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCustomersData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setError('Không thể tải danh sách khách hàng.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersData();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModalForAdd = () => {
    setSelectedCustomer(null);
    setFormData(initialFormState);
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = customer => {
    setSelectedCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      address: customer.address,
      taxCode: customer.taxCode,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
    setFormData(initialFormState);
    setError('');
  };

  const handleSaveCustomer = async e => {
    e.preventDefault();
    setError('');
    if (
      !formData.code.trim() ||
      !formData.name.trim() ||
      !formData.address.trim() ||
      !formData.taxCode.trim()
    ) {
      setError('Vui lòng điền đầy đủ thông tin khách hàng.');
      return;
    }

    setIsLoading(true);
    try {
      if (selectedCustomer) {
        await updateCustomer(selectedCustomer.id, formData);
      } else {
        await addCustomer(formData);
      }
      await fetchCustomersData();
      handleCloseModal();
    } catch (err) {
      setError(err.message || `Lỗi khi ${selectedCustomer ? 'cập nhật' : 'thêm'} khách hàng.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = customer => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomers(customers.filter(c => c.id !== customerToDelete.id));
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    } catch (error) {
      setError(error.message);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setCustomerToDelete(null);
  };

  return (
    <div className="p-4 sm:p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Danh sách khách hàng</h1>
        <button
          onClick={handleOpenModalForAdd}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mã
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Địa chỉ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mã số thuế
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading && customers.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Đang tải...
                </td>
              </tr>
            )}
            {!isLoading && error && customers.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-red-500">
                  {error}
                </td>
              </tr>
            )}
            {!isLoading && !error && customers.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-gray-500">
                  Chưa có khách hàng nào.
                </td>
              </tr>
            )}
            {customers.map(customer => (
              <tr key={customer.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {customer.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{customer.address}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {customer.taxCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleOpenModalForEdit(customer)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteClick(customer)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedCustomer ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
              </h3>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: CDMC"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tên</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Công ty Cổ phần Chè"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Địa chỉ</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mã số thuế</label>
                  <input
                    type="text"
                    name="taxCode"
                    value={formData.taxCode}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: 5500157123"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="flex justify-end space-x-3 mt-5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {selectedCustomer ? 'Lưu' : 'Thêm'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        message={
          <div className="mt-2">
            <p className="text-sm text-gray-500 mb-4">Bạn có chắc chắn muốn xóa khách hàng này?</p>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium text-gray-500">Mã khách hàng:</div>
                <div className="text-gray-900">{customerToDelete?.code}</div>
                <div className="font-medium text-gray-500">Tên khách hàng:</div>
                <div className="text-gray-900">{customerToDelete?.name}</div>
                <div className="font-medium text-gray-500">Địa chỉ:</div>
                <div className="text-gray-900">{customerToDelete?.address}</div>
                <div className="font-medium text-gray-500">Mã số thuế:</div>
                <div className="text-gray-900">{customerToDelete?.taxCode}</div>
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default QuanLyKhachHang;
