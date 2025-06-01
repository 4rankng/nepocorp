import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from '@contexts/AuthContext';
import { ErrorBoundary, ErrorPage } from '@components/ErrorBoundary';
import { createLazyComponent, LazyLoadingWrapper } from '@components/LazyLoadingWrapper';

// Lazy load components with proper error handling
const TrangChu = createLazyComponent(() => import('@layouts/TrangChu'), 'TrangChu');
const TrangXacThuc = createLazyComponent(() => import('@layouts/TrangXacThuc'), 'TrangXacThuc');
const DangNhap = createLazyComponent(() => import('@features/xac-thuc/DangNhap'), 'DangNhap');
const BaoCaoTaiChinh = createLazyComponent(() => import('@features/bao-cao/BaoCaoTaiChinh'), 'BaoCaoTaiChinh');
const QuanLyLichVanChuyen = createLazyComponent(() => import('@features/lich-van-chuyen/QuanLyLichVanChuyen'), 'QuanLyLichVanChuyen');
const QuanLyNhanVien = createLazyComponent(() => import('@features/nhan-vien/QuanLyNhanVien'), 'QuanLyNhanVien');
const QuanLyKhachHang = createLazyComponent(() => import('@features/khach-hang/QuanLyKhachHang'), 'QuanLyKhachHang');
const QuanLyDoiTac = createLazyComponent(() => import('@features/doi-tac/QuanLyDoiTac'), 'QuanLyDoiTac');
const QuanLyPhuongTien = createLazyComponent(() => import('@features/phuong-tien/QuanLyPhuongTien'), 'QuanLyPhuongTien');
const QuanLyDinhMuc = createLazyComponent(() => import('@features/dinh-muc/QuanLyDinhMuc'), 'QuanLyDinhMuc');
const QuanLyBaoDuong = createLazyComponent(() => import('@features/bao-duong/QuanLyBaoDuong'), 'QuanLyBaoDuong');
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
          element: withErrorBoundaryAndSuspense(BaoCaoTaiChinh, 'Đang tải báo cáo tài chính...'),
          errorElement: <ErrorPage />,
        },
        {
          path: 'lich-van-chuyen',
          element: withErrorBoundaryAndSuspense(QuanLyLichVanChuyen, 'Đang tải lịch vận chuyển...'),
          errorElement: <ErrorPage />,
        },
        {
          path: 'nhan-vien',
          element: withErrorBoundaryAndSuspense(QuanLyNhanVien, 'Đang tải quản lý nhân viên...'),
          errorElement: <ErrorPage />,
        },
        {
          path: 'khach-hang',
          element: withErrorBoundaryAndSuspense(QuanLyKhachHang, 'Đang tải quản lý khách hàng...'),
          errorElement: <ErrorPage />,
        },
        {
          path: 'doi-tac',
          element: withErrorBoundaryAndSuspense(QuanLyDoiTac, 'Đang tải quản lý đối tác...'),
          errorElement: <ErrorPage />,
        },
        {
          path: 'phuong-tien',
          element: withErrorBoundaryAndSuspense(QuanLyPhuongTien, 'Đang tải quản lý phương tiện...'),
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
          element: withErrorBoundaryAndSuspense(QuanLyDinhMuc, 'Đang tải định mức...'),
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
          element: withErrorBoundaryAndSuspense(QuanLyBaoDuong, 'Đang tải bảo dưỡng...'),
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
    {
      path: '/xac-thuc',
      element: (
        <ErrorBoundary>
          <LazyLoadingWrapper loadingMessage="Đang tải trang xác thực...">
            <TrangXacThuc />
          </LazyLoadingWrapper>
        </ErrorBoundary>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: 'dang-nhap',
          element: withErrorBoundaryAndSuspense(DangNhap, 'Đang tải trang đăng nhập...'),
          errorElement: <ErrorPage />,
        },
      ],
    },
  ],
  routerConfig
);
export default router;
