import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import TrangChu from '../layouts/TrangChu';
import TrangXacThuc from '../layouts/TrangXacThuc';
import DangNhap from '../features/xac-thuc/DangNhap';
import BaoCaoTaiChinh from '../features/bao-cao/BaoCaoTaiChinh';
import LichVanChuyen from '../features/lich-van-chuyen/LichVanChuyen';
import DanhSachNhanVien from '../features/nhan-vien/DanhSachNhanVien';
import DanhSachKhachHang from '../features/khach-hang/DanhSachKhachHang';
import DanhSachDoiTac from '../features/doi-tac/DanhSachDoiTac';
import DanhSachPhuongTien from '../features/phuong-tien/DanhSachPhuongTien';
import DanhSachContainer from '../features/container/DanhSachContainer';
import QuanLyChiPhi from '../features/chi-phi/QuanLyChiPhi';
import QuanLyDinhMucDuong from '../features/chi-phi/QuanLyDinhMucDuong';

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <TrangChu />,
      children: [
        {
          path: 'bao-cao',
          element: <BaoCaoTaiChinh />,
        },
        {
          path: 'lich-van-chuyen',
          element: <LichVanChuyen />,
        },
        {
          path: 'nhan-vien',
          element: <DanhSachNhanVien />,
        },
        {
          path: 'khach-hang',
          element: <DanhSachKhachHang />,
        },
        {
          path: 'doi-tac',
          element: <DanhSachDoiTac />,
        },
        {
          path: 'phuong-tien',
          element: <DanhSachPhuongTien />,
        },
        {
          path: 'container',
          element: <DanhSachContainer />,
        },
        {
          path: 'chi-phi',
          element: <QuanLyChiPhi />,
        },
        {
          path: 'chi-phi-cau-hinh',
          element: <QuanLyDinhMucDuong />,
        },
      ],
    },
    {
      path: '/xac-thuc',
      element: <TrangXacThuc />,
      children: [
        {
          path: 'dang-nhap',
          element: <DangNhap />,
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
