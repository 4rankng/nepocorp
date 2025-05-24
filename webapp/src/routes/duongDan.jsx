import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary, ErrorPage } from '../components/ErrorBoundary';
import TrangChu from '../layouts/TrangChu';
import TrangXacThuc from '../layouts/TrangXacThuc';
import DangNhap from '../features/xac-thuc/DangNhap';
import BaoCaoTaiChinh from '../features/bao-cao/BaoCaoTaiChinh';
import LichVanChuyen from '../features/lich-van-chuyen/LichVanChuyen';
import DanhSachNhanVien from '../features/nhan-vien/DanhSachNhanVien';
import DanhSachKhachHang from '../features/khach-hang/DanhSachKhachHang';
import DanhSachDoiTac from '../features/doi-tac/DanhSachDoiTac';
import QuanLyPhuongTien from '../features/phuong-tien/QuanLyPhuongTien';
import QuanLyChiPhi from '../features/chi-phi/QuanLyChiPhi';
import QuanLyDinhMucDuong from '../features/chi-phi/QuanLyDinhMucDuong';

// Wrap the app with AuthProvider
const AppWithAuth = ({ children }) => (
  <AuthProvider>
    {children}
  </AuthProvider>
);

const withErrorBoundary = (Component) => {
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
          errorElement: <ErrorPage />
        },
        {
          path: 'lich-van-chuyen',
          element: withErrorBoundary(LichVanChuyen),
          errorElement: <ErrorPage />
        },
        {
          path: 'nhan-vien',
          element: withErrorBoundary(DanhSachNhanVien),
          errorElement: <ErrorPage />
        },
        {
          path: 'khach-hang',
          element: withErrorBoundary(DanhSachKhachHang),
          errorElement: <ErrorPage />
        },
        {
          path: 'doi-tac',
          element: withErrorBoundary(DanhSachDoiTac),
          errorElement: <ErrorPage />
        },
        {
          path: 'phuong-tien',
          element: withErrorBoundary(QuanLyPhuongTien),
          errorElement: <ErrorPage />,
          children: [
            {
              path: ':tab',
              element: withErrorBoundary(QuanLyPhuongTien),
              errorElement: <ErrorPage />
            },
            {
              path: '',
              element: <Navigate to="xe-van-chuyen" replace />,
            },
          ],
        },
        // Keep old route for backward compatibility
        {
          path: 'phuong-tien',
          element: <Navigate to="/phuong-tien/xe-van-chuyen" replace />,
        },
        {
          path: 'container',
          element: <Navigate to="/phuong-tien/loai-container" replace />,
        },
        {
          path: 'chi-phi',
          element: withErrorBoundary(QuanLyChiPhi),
          errorElement: <ErrorPage />
        },
        {
          path: 'chi-phi-cau-hinh',
          element: withErrorBoundary(QuanLyDinhMucDuong),
          errorElement: <ErrorPage />
        },
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
          errorElement: <ErrorPage />
        },
      ],
    },
  ],
  {
    future: {
      v7_startTransition: true,
    },
  }
);

export default router;
