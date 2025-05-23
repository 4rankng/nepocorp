import React, { useState } from 'react';
import BaoCaoLoiNhuan from './BaoCaoLoiNhuan';
import BaoCaoChiPhi from './BaoCaoChiPhi';
import BaoCaoDoanhThu from './BaoCaoDoanhThu';
import BaoCaoCongNo from './BaoCaoCongNo';

const tabs = [
  { id: 'loi-nhuan', label: 'Lợi nhuận & Doanh thu' },
  { id: 'chi-phi', label: 'Chi tiết chi phí' },
  { id: 'doanh-thu', label: 'Theo dõi Doanh thu/Chi phí' },
  { id: 'cong-no', label: 'Báo cáo Công nợ' },
];

const BaoCaoTaiChinh = () => {
  const [activeTab, setActiveTab] = useState('loi-nhuan');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'loi-nhuan':
        return <BaoCaoLoiNhuan />;
      case 'chi-phi':
        return <BaoCaoChiPhi />;
      case 'doanh-thu':
        return <BaoCaoDoanhThu />;
      case 'cong-no':
        return <BaoCaoCongNo />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex -mb-px">
          {tabs.map((tab) => (
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
