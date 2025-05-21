import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import QuanLy from './QuanLy';
import KeToan from './KeToan';
import GiaoNhan from './GiaoNhan';
import LaiXe from './LaiXe';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/quanly/*" element={<QuanLy />} />
      <Route path="/ketoan/*" element={<KeToan />} />
      <Route path="/giaonhan/*" element={<GiaoNhan />} />
      <Route path="/laixe/*" element={<LaiXe />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
