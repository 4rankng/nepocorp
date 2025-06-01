import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { SwipeTabs } from '@/components';
import DinhMucBoSung from './components/DinhMucBoSung';
import DinhMucChoHang from './components/DinhMucChoHang';
import DinhMucVoRong from './components/DinhMucVoRong';
import DinhMucDiDuong from './components/DinhMucDiDuong';
const TABS = [
  { value: 'bo-sung', label: 'Bổ Sung' },
  { value: 'cho-hang', label: 'Chở hàng' },
  { value: 'vo-rong', label: 'Vỏ rỗng' },
  { value: 'di-duong', label: 'Đi đường' },
];
const QuanLyDinhMuc = () => {
  const { tab: tabFromUrl = TABS[0].value } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : TABS[0].value;
  // Redirect to the default tab if the current tab from URL is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/dinh-muc/${TABS[0].value}`, { replace: true });
    }
  }, [tabFromUrl, navigate]);
  const handleTabChange = newValue => {
    navigate(`/dinh-muc/${newValue}`);
  };
  const renderTabContent = () => {
    switch (activeTab) {
      case 'bo-sung':
        return <DinhMucBoSung />;
      case 'cho-hang':
        return <DinhMucChoHang />;
      case 'vo-rong':
        return <DinhMucVoRong />;
      case 'di-duong':
        return <DinhMucDiDuong />;
      default:
        return null;
    }
  };
  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <SwipeTabs
        tabs={TABS}
        activeTab={activeTab}
        basePath="/dinh-muc"
        onTabChange={handleTabChange}
      >
        <Box
          sx={{
            flexGrow: 1,
            overflowY: 'auto',
            p: isMobile ? 1 : 2,
          }}
        >
          {renderTabContent()}
        </Box>
      </SwipeTabs>
    </Box>
  );
};
export default QuanLyDinhMuc;
