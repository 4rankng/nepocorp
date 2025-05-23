import React, { useState } from 'react';
import BaoCaoLoiNhuanDoanhThu from './BaoCaoLoiNhuanDoanhThu';
import BaoCaoChiTietChiPhi from './BaoCaoChiTietChiPhi';
import BaoCaoTheoDoiDoanhThuChiPhiPhuongTien from './BaoCaoTheoDoiDoanhThuChiPhiPhuongTien';
import BaoCaoCongNo from './BaoCaoCongNo';

const tabs = [
  { id: 'loi-nhuan-doanh-thu', label: 'Lợi nhuận & Doanh thu' },
  { id: 'chi-tiet-chi-phi', label: 'Chi tiết chi phí' },
  { id: 'phuong-tien-van-chuyen', label: 'Theo dõi Doanh thu/Chi phí' },
  { id: 'bao-cao-cong-no', label: 'Báo cáo Công nợ' },
];

const BaoCaoTaiChinh = () => {
  const [activeTab, setActiveTab] = useState('loi-nhuan-doanh-thu');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'loi-nhuan-doanh-thu':
        return <BaoCaoLoiNhuanDoanhThu />;
      case 'chi-tiet-chi-phi':
        return <BaoCaoChiTietChiPhi />;
      case 'phuong-tien-van-chuyen':
        return <BaoCaoTheoDoiDoanhThuChiPhiPhuongTien />;
      case 'bao-cao-cong-no':
        return <BaoCaoCongNo />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex -mb-px">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6">{renderTabContent()}</div>
    </div>
  );
};

export default BaoCaoTaiChinh;
