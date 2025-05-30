import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from '@contexts/AuthContext';
import { ErrorBoundary, ErrorPage } from '@components/ErrorBoundary';
import TrangChu from '@layouts/TrangChu';
import TrangXacThuc from '@layouts/TrangXacThuc';
import DangNhap from '@features/xac-thuc/DangNhap';
import BaoCaoTaiChinh from '@features/bao-cao/BaoCaoTaiChinh';
import QuanLyLichVanChuyen from '@features/lich-van-chuyen/QuanLyLichVanChuyen';
import QuanLyNhanVien from '@features/nhan-vien/QuanLyNhanVien';
import QuanLyKhachHang from '@features/khach-hang/QuanLyKhachHang';
import QuanLyDoiTac from '@features/doi-tac/QuanLyDoiTac';
import QuanLyPhuongTien from '@features/phuong-tien/QuanLyPhuongTien';
import QuanLyDinhMuc from '@features/dinh-muc/QuanLyDinhMuc';
import QuanLyBaoDuong from '@features/bao-duong/QuanLyBaoDuong';
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
const withErrorBoundary = Component => {
  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
};
const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <ErrorBoundary>
          <AppWithAuth>
            <TrangChu />
          </AppWithAuth>
        </ErrorBoundary>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: 'bao-cao',
          element: withErrorBoundary(BaoCaoTaiChinh),
          errorElement: <ErrorPage />,
        },
        {
          path: 'lich-van-chuyen',
          element: withErrorBoundary(QuanLyLichVanChuyen),
          errorElement: <ErrorPage />,
        },
        {
          path: 'nhan-vien',
          element: withErrorBoundary(QuanLyNhanVien),
          errorElement: <ErrorPage />,
        },
        {
          path: 'khach-hang',
          element: withErrorBoundary(QuanLyKhachHang),
          errorElement: <ErrorPage />,
        },
        {
          path: 'doi-tac',
          element: withErrorBoundary(QuanLyDoiTac),
          errorElement: <ErrorPage />,
        },
        {
          path: 'phuong-tien',
          element: withErrorBoundary(QuanLyPhuongTien),
          errorElement: <ErrorPage />,
          children: [
            {
              path: ':tab',
              element: withErrorBoundary(QuanLyPhuongTien),
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
          element: withErrorBoundary(QuanLyDinhMuc),
          errorElement: <ErrorPage />,
          children: [
            {
              path: ':tab',
              element: withErrorBoundary(QuanLyDinhMuc),
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
          element: withErrorBoundary(QuanLyBaoDuong),
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
          <TrangXacThuc />
        </ErrorBoundary>
      ),
      errorElement: <ErrorPage />,
      children: [
        {
          path: 'dang-nhap',
          element: withErrorBoundary(DangNhap),
          errorElement: <ErrorPage />,
        },
      ],
    },
  ],
  routerConfig
);
export default router;
