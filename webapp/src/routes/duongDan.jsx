import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from '@contexts/AuthContext';
import { ErrorBoundary, ErrorPage } from '@components/ErrorBoundary';
import { createLazyComponent, LazyLoadingWrapper } from '@components/LazyLoadingWrapper';
import ProtectedRoute from '@components/ProtectedRoute';

// Lazy load components with proper error handling
const TrangChu = createLazyComponent(() => import('@layouts/TrangChu'), 'TrangChu');
const BaoCaoTaiChinh = createLazyComponent(
  () => import('@features/bao-cao/BaoCaoTaiChinh'),
  'BaoCaoTaiChinh'
);
const QuanLyLichVanChuyen = createLazyComponent(
  () => import('@features/lich-van-chuyen/QuanLyLichVanChuyen'),
  'QuanLyLichVanChuyen'
);
const QuanLyNhanVien = createLazyComponent(
  () => import('@features/nhan-vien/QuanLyNhanVien'),
  'QuanLyNhanVien'
);
const QuanLyKhachHang = createLazyComponent(
  () => import('@features/khach-hang/QuanLyKhachHang'),
  'QuanLyKhachHang'
);
const QuanLyDoiTac = createLazyComponent(
  () => import('@features/doi-tac/QuanLyDoiTac'),
  'QuanLyDoiTac'
);
const QuanLyPhuongTien = createLazyComponent(
  () => import('@features/phuong-tien/QuanLyPhuongTien'),
  'QuanLyPhuongTien'
);
const QuanLyDinhMuc = createLazyComponent(
  () => import('@features/dinh-muc/QuanLyDinhMuc'),
  'QuanLyDinhMuc'
);
const QuanLyBaoDuong = createLazyComponent(
  () => import('@features/bao-duong/QuanLyBaoDuong'),
  'QuanLyBaoDuong'
);
const QuanLyPhieuChi = createLazyComponent(
  () => import('@features/phieu-chi/QuanLyPhieuChi'),
  'QuanLyPhieuChi'
);
const QuanLyPhieuThu = createLazyComponent(
  () => import('@features/phieu-thu/QuanLyPhieuThu'),
  'QuanLyPhieuThu'
);
const QuanLyBangCongNo = createLazyComponent(
  () => import('@features/bang-cong-no/QuanLyBangCongNo'),
  'QuanLyBangCongNo'
);
// Future flags for React Router v7
const routerConfig = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
};

// Wrap the app with AuthProvider
const AppWithAuth = ({ children }) => <AuthProvider>{children}</AuthProvider>;

// Create a wrapper for components with error boundary and suspense
const withErrorBoundaryAndSuspense = (Component, loadingMessage) => {
  return (
    <LazyLoadingWrapper loadingMessage={loadingMessage}>
      <Component />
    </LazyLoadingWrapper>
  );
};
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <ErrorBoundary>
          <AppWithAuth>
            <LazyLoadingWrapper loadingMessage="Đang tải trang chủ...">
              <TrangChu />
            </LazyLoadingWrapper>
          </AppWithAuth>
        </ErrorBoundary>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: 'bao-cao',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(BaoCaoTaiChinh, 'Đang tải báo cáo tài chính...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        {
          path: 'lich-van-chuyen',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyLichVanChuyen, 'Đang tải lịch vận chuyển...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        {
          path: 'nhan-vien',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyNhanVien, 'Đang tải quản lý nhân viên...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        {
          path: 'khach-hang',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyKhachHang, 'Đang tải quản lý khách hàng...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        {
          path: 'doi-tac',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyDoiTac, 'Đang tải quản lý đối tác...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        {
          path: 'phuong-tien',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyPhuongTien, 'Đang tải quản lý phương tiện...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
          children: [
            {
              path: ':tab',
              element: withErrorBoundaryAndSuspense(QuanLyPhuongTien, 'Đang tải phương tiện...'),
              errorElement: <ErrorPage />,
            },
            {
              path: '',
              element: <Navigate to="dau-keo" replace />,
            },
          ],
        },
        // DinhMuc nested routes
        {
          path: 'dinh-muc',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyDinhMuc, 'Đang tải định mức...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
          children: [
            {
              path: ':tab',
              element: withErrorBoundaryAndSuspense(QuanLyDinhMuc, 'Đang tải định mức...'),
              errorElement: <ErrorPage />,
            },
            {
              path: '',
              element: <Navigate to="bo-sung" replace />,
            },
          ],
        },
        // BaoDuong route with tab support
        {
          path: 'bao-duong',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyBaoDuong, 'Đang tải bảo dưỡng...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        // PhieuChi route
        {
          path: 'phieu-chi',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyPhieuChi, 'Đang tải phiếu chi...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        // PhieuThu route
        {
          path: 'phieu-thu',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyPhieuThu, 'Đang tải phiếu thu...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        // BangCongNo route
        {
          path: 'bang-cong-no',
          element: (
            <ProtectedRoute>
              {withErrorBoundaryAndSuspense(QuanLyBangCongNo, 'Đang tải bảng công nợ...')}
            </ProtectedRoute>
          ),
          errorElement: <ErrorPage />,
        },
        // Keep old routes for backward compatibility
        {
          path: 'xe-van-chuyen',
          element: <Navigate to="/phuong-tien/dau-keo" replace />,
        },
        {
          path: 'loai-container',
          element: <Navigate to="/phuong-tien/container" replace />,
        },
        // {
        //   path: 'chi-phi',
        //   element: withErrorBoundary(QuanLyChiPhi),
        //   errorElement: <ErrorPage />,
        // },
        // {
        //   path: 'chi-phi-cau-hinh',
        //   element: withErrorBoundary(QuanLyDinhMucDuong),
        //   errorElement: <ErrorPage />,
        // },
      ],
    },
  ],
  routerConfig
);
export default router;
