import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import Dropdown from '@components/ui/Dropdown';

const LicensePlateSelectionModal = ({ open, onClose, onSelect, licensePlates, isLoading }) => {
  const handleSelectChange = (value) => {
    onSelect(value);
    onClose();
  };

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation(); // Prevent parent modal from reacting
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [open, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">Chọn Biển Số Xe</h1>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>
        <div className="p-4">
          <Dropdown
            value={null} // No initial value, always select new
            onChange={handleSelectChange}
            options={licensePlates}
            placeholder="Tìm kiếm hoặc chọn biển số xe"
            searchable={true}
            clearable={true}
            loading={isLoading}
            className="text-sm"
            style={{ fontSize: '14px' }}
          />
        </div>
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

LicensePlateSelectionModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  licensePlates: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
    })
  ).isRequired,
  isLoading: PropTypes.bool,
};

export default LicensePlateSelectionModal;
