import React, { useState, useEffect } from 'react';
import {
  getContainerTypes,
  addContainerType,
  updateContainerType,
  deleteContainerType,
} from '../../services/mockData'; // Adjusted path

// SVG Icons (Heroicons)
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

const PencilIcon = (
  { className = 'w-5 h-5' } // Slightly smaller for table actions
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

const TrashIcon = (
  { className = 'w-5 h-5' } // Slightly smaller for table actions
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

const QuanLyLoaiContainer = () => {
  const [containerTypes, setContainerTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null); // null for add, object for edit
  const [currentTypeName, setCurrentTypeName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const types = await getContainerTypes();
      setContainerTypes(types);
    } catch (err) {
      setError('Không thể tải danh sách loại container.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleOpenModalForAdd = () => {
    setEditingType(null);
    setCurrentTypeName('');
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenModalForEdit = type => {
    setEditingType(type);
    setCurrentTypeName(type.name);
    setError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingType(null);
    setCurrentTypeName('');
    setError('');
  };

  const handleSaveType = async () => {
    if (!currentTypeName.trim()) {
      setError('Tên loại container không được để trống.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      if (editingType) {
        await updateContainerType(editingType.id, currentTypeName.trim());
      } else {
        await addContainerType(currentTypeName.trim());
      }
      await fetchTypes(); // Refresh list
      handleCloseModal();
    } catch (err) {
      setError(`Lỗi khi ${editingType ? 'cập nhật' : 'thêm'} loại container.`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteType = async id => {
    if (window.confirm('Bạn có chắc chắn muốn xóa loại container này?')) {
      setIsLoading(true);
      setError('');
      try {
        await deleteContainerType(id);
        await fetchTypes(); // Refresh list
      } catch (err) {
        setError('Lỗi khi xóa loại container.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Quản Lý Loại Container</h1>

      {/* List Display */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {isLoading && containerTypes.length === 0 && (
            <li className="p-4 text-center text-gray-500">Đang tải...</li>
          )}
          {!isLoading && error && <li className="p-4 text-center text-red-500">{error}</li>}
          {!isLoading && !error && containerTypes.length === 0 && (
            <li className="p-4 text-center text-gray-500">Chưa có loại container nào.</li>
          )}
          {containerTypes.map(type => (
            <li
              key={type.id}
              className="p-4 hover:bg-gray-50 flex justify-between items-center transition-colors"
            >
              <span className="text-gray-700 text-lg">{type.name}</span>
              <div className="space-x-3">
                <button
                  onClick={() => handleOpenModalForEdit(type)}
                  className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-100"
                  title="Chỉnh sửa"
                >
                  <PencilIcon />
                </button>
                <button
                  onClick={() => handleDeleteType(type.id)}
                  className="text-red-600 hover:text-red-800 transition-colors p-1 rounded hover:bg-red-100"
                  title="Xóa"
                >
                  <TrashIcon />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* FAB */}
      <button
        onClick={handleOpenModalForAdd}
        className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        title="Thêm loại container mới"
      >
        <PlusIcon className="w-8 h-8" />
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              {editingType ? 'Chỉnh Sửa Loại Container' : 'Thêm Loại Container Mới'}
            </h2>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <div>
              <label htmlFor="typeName" className="block text-sm font-medium text-gray-700 mb-1">
                Tên loại container
              </label>
              <input
                type="text"
                id="typeName"
                value={currentTypeName}
                onChange={e => setCurrentTypeName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ví dụ: 20'RF, 40'HC..."
              />
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveType}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                  isLoading
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                }`}
              >
                {isLoading ? (editingType ? 'Đang cập nhật...' : 'Đang lưu...') : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyLoaiContainer;
