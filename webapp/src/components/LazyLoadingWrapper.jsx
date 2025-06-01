import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

// Loading component
const LoadingFallback = ({ message = 'Đang tải...' }) => (
  <div 
    style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '200px',
      flexDirection: 'column'
    }}
    className="p-4"
  >
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
    <div className="text-gray-600">{message}</div>
  </div>
);

// Error fallback component
const ErrorFallback = ({ componentName }) => (
  <div className="p-4 text-center">
    <h3 className="text-lg font-semibold text-red-600 mb-2">Không thể tải component</h3>
    <p className="text-gray-600 mb-4">
      Lỗi khi tải {componentName}. Vui lòng kiểm tra kết nối mạng và thử lại.
    </p>
    <button 
      onClick={() => window.location.reload()}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
    >
      Tải lại trang
    </button>
  </div>
);

// Utility function to create lazy components with error handling
export const createLazyComponent = (importFunction, componentName = 'Component') => {
  return lazy(() => 
    importFunction().catch(error => {
      console.error(`Failed to load ${componentName}:`, error);
      return { 
        default: () => <ErrorFallback componentName={componentName} />
      };
    })
  );
};

// Wrapper component for lazy loaded components
export const LazyLoadingWrapper = ({ 
  children, 
  fallback, 
  loadingMessage = 'Đang tải...' 
}) => {
  const defaultFallback = <LoadingFallback message={loadingMessage} />;
  
  return (
    <ErrorBoundary>
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

export default LazyLoadingWrapper;
