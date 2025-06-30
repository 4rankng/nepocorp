import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';
import Dropdown from '@components/ui/Dropdown';
import { Z_INDEX } from '@constants/zIndex';

const LicensePlateSelectionModal = ({ open, onClose, onSelect, licensePlates, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLicensePlates = licensePlates.filter(plate =>
    plate.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tractorPlates = filteredLicensePlates.filter(plate => plate.type === 'tractor');
  const trailerPlates = filteredLicensePlates.filter(plate => plate.type === 'trailer');

  const handlePlateClick = value => {
    onSelect(value);
    onClose();
  };

  useEffect(() => {
    const handleEscKey = event => {
      if (event.key === 'Escape' && open) {
        event.stopPropagation(); // Prevent parent modal from reacting
        event.preventDefault(); // Prevent default behavior
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscKey, true); // Use capture phase
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey, true);
    };
  }, [open, onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      style={{ zIndex: Z_INDEX.SYSTEM_MODAL }}
    >
      <div
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh]"
        style={{ zIndex: Z_INDEX.SYSTEM_MODAL + 1 }}
      >
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">Chọn Biển Số Xe</h1>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <CloseIcon sx={{ fontSize: 20 }} />
          </button>
        </div>
        <div className="p-4">
          <input
            type="text"
            placeholder="Tìm kiếm biển số xe..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h2 className="text-md font-semibold text-gray-800 mb-3">Đầu kéo</h2>
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                  {tractorPlates.length > 0 ? (
                    tractorPlates.map(plate => (
                      <button
                        key={plate.value}
                        onClick={() => handlePlateClick(plate.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-blue-500 hover:text-white transition-colors duration-200 ease-in-out whitespace-nowrap"
                      >
                        {plate.label}
                      </button>
                    ))
                  ) : (
                    <p className="col-span-full text-center text-gray-500 text-xs">
                      Không tìm thấy biển số đầu kéo nào.
                    </p>
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-md font-semibold text-gray-800 mb-3">Rơ moóc</h2>
                <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                  {trailerPlates.length > 0 ? (
                    trailerPlates.map(plate => (
                      <button
                        key={plate.value}
                        onClick={() => handlePlateClick(plate.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-blue-500 hover:text-white transition-colors duration-200 ease-in-out whitespace-nowrap"
                      >
                        {plate.label}
                      </button>
                    ))
                  ) : (
                    <p className="col-span-full text-center text-gray-500 text-xs">
                      Không tìm thấy biển số rơ moóc nào.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
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
