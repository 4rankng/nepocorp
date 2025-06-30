import React from 'react';
import PropTypes from 'prop-types';

/**
 * ModalBody - Standardized content area for all modals
 * Provides consistent padding, scrolling, and state management
 */
const ModalBody = ({
  children,
  className = '',
  padding = 'default',
  scroll = true,
  loading = false,
  error = null,
  success = null,
  loadingComponent = null,
  errorComponent = null,
  successComponent = null,
  id
}) => {
  // Padding configurations
  const paddingConfig = {
    none: '',
    sm: 'p-2',
    default: 'p-4',
    lg: 'p-6'
  };

  // Default loading component
  const defaultLoadingComponent = (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  // Default error component
  const defaultErrorComponent = (error) => (
    <div className="p-4 bg-red-100 border-2 border-red-300 rounded-lg text-red-800 text-sm mb-4 shadow-lg">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <div className="font-medium">
          {typeof error === 'string' ? error : 'Đã xảy ra lỗi'}
        </div>
      </div>
    </div>
  );

  // Default success component
  const defaultSuccessComponent = (success) => (
    <div className="p-4 bg-green-100 border-2 border-green-300 rounded-lg text-green-800 text-sm mb-4 shadow-lg">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <div className="font-medium">
          {typeof success === 'string' ? success : 'Thành công'}
        </div>
      </div>
    </div>
  );

  const baseClasses = `
    flex-1 text-sm
    ${scroll ? 'overflow-y-auto' : 'overflow-hidden'}
    ${paddingConfig[padding]}
    ${className}
  `.trim();

  return (
    <div className={baseClasses} id={id}>
      {/* Loading State */}
      {loading && (
        loadingComponent || defaultLoadingComponent
      )}

      {/* Error State */}
      {error && !loading && (
        errorComponent ? errorComponent(error) : defaultErrorComponent(error)
      )}

      {/* Success State */}
      {success && !loading && (
        successComponent ? successComponent(success) : defaultSuccessComponent(success)
      )}

      {/* Content */}
      {!loading && children}
    </div>
  );
};

ModalBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  padding: PropTypes.oneOf(['none', 'sm', 'default', 'lg']),
  scroll: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  success: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  loadingComponent: PropTypes.node,
  errorComponent: PropTypes.func,
  successComponent: PropTypes.func,
  id: PropTypes.string
};

export default ModalBody;