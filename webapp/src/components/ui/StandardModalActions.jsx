import React from 'react';
import PropTypes from 'prop-types';

const StandardModalActions = ({
  primaryAction,
  secondaryAction,
  leftAction,
  className = ''
}) => {
  return (
    <div className={`px-4 py-3 border-t border-gray-200 flex justify-between items-center ${className}`}>
      {leftAction ? (
        <div className="flex items-center">
          {leftAction}
        </div>
      ) : (
        <div></div>
      )}
      
      <div className="flex gap-2">
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
            disabled={secondaryAction.disabled}
          >
            {secondaryAction.label}
          </button>
        )}
        
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className={`px-4 py-1.5 text-white text-sm rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed ${
              primaryAction.variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={primaryAction.disabled}
          >
            {primaryAction.loading ? `${primaryAction.loadingText || 'Loading...'}` : primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};

StandardModalActions.propTypes = {
  primaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    loadingText: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'danger'])
  }),
  secondaryAction: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool
  }),
  leftAction: PropTypes.node,
  className: PropTypes.string
};

export default StandardModalActions;