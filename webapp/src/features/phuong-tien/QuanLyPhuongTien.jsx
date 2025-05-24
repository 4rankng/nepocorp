import React, { useEffect, useState } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { TabContext, TabPanel } from '@mui/lab';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import XeVanChuyen from './components/XeVanChuyen';
import LoaiContainer from './components/LoaiContainer';
import DinhMucDau from './components/DinhMucDau';
import BaoDuong from './components/BaoDuong';

// Define valid tabs and their labels
const TABS = [
  { value: 'xe-van-chuyen', label: 'Xe Vận Chuyển' },
  { value: 'loai-container', label: 'Loại Container' },
  { value: 'dinh-muc-dau', label: 'Định Mức Dầu' },
  { value: 'bao-duong', label: 'Bảo Dưỡng' },
];

const QuanLyPhuongTien = () => {
  const { tab: tabFromUrl = 'xe-van-chuyen' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Set the active tab based on URL parameter
  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : 'xe-van-chuyen';

  // Redirect to the first tab if the current tab is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/phuong-tien/xe-van-chuyen`, { replace: true });
    }
  }, [tabFromUrl, navigate]);

  const handleTabChange = (event, newValue) => {
    navigate(`/phuong-tien/${newValue}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Quản Lý Phương Tiện</h1>

      <Box sx={{ width: '100%', typography: 'body1' }}>
        <TabContext value={activeTab}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Quản lý phương tiện tabs"
            >
              {TABS.map(tab => (
                <Tab key={tab.value} label={tab.label} value={tab.value} />
              ))}
            </Tabs>
          </Box>

          <TabPanel value="xe-van-chuyen" sx={{ p: 0, mt: 2 }}>
            <XeVanChuyen />
          </TabPanel>

          <TabPanel value="loai-container" sx={{ p: 0, mt: 2 }}>
            <LoaiContainer />
          </TabPanel>

          <TabPanel value="dinh-muc-dau" sx={{ p: 0, mt: 2 }}>
            <DinhMucDau />
          </TabPanel>

          <TabPanel value="bao-duong" sx={{ p: 0, mt: 2 }}>
            <BaoDuong />
          </TabPanel>
        </TabContext>
      </Box>
    </div>
  );
};

export default QuanLyPhuongTien;
