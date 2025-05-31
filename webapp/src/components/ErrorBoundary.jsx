import React, { Component } from 'react';
import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {

  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Đã xảy ra lỗi!</h1>
            <p className="text-gray-700 mb-6">
              Rất tiếc, đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.
            </p>
            <div className="bg-gray-100 p-4 rounded-md text-left mb-6">
              <p className="text-sm text-gray-600 font-mono">
                {this.state.error?.message || 'Không có thông tin lỗi'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
// A component that uses the useRouteError hook
function ErrorPage() {
  const error = useRouteError();

  let errorMessage = 'Đã xảy ra lỗi không xác định';
  if (isRouteErrorResponse(error)) {
    // Error from the router
    errorMessage = error.statusText || error.data?.message || `Lỗi ${error.status}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Đã xảy ra lỗi!</h1>
        <p className="text-gray-700 mb-6">{errorMessage}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Quay lại
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
export { ErrorBoundary, ErrorPage };
