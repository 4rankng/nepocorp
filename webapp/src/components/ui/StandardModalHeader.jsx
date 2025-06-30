import React from 'react';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/Close';

const StandardModalHeader = ({
  title,
  subtitle,
  onClose,
  actions,
  className = ''
}) => {
  return (
    <div className={`px-4 py-3 border-b border-gray-200 flex justify-between items-center ${className}`}>
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900">
          {title}
        </h1>
        {subtitle && (
          <span className="text-sm text-gray-600">
            {subtitle}
          </span>
        )}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600"
      >
        <CloseIcon sx={{ fontSize: 20 }} />
      </button>
    </div>
  );
};

StandardModalHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  actions: PropTypes.node,
  className: PropTypes.string
};

export default StandardModalHeader;