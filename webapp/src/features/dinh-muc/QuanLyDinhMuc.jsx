import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Box, Tabs, Tab, Paper, Typography, useTheme, useMediaQuery } from '@mui/material';
import DinhMucBoSung from './components/DinhMucBoSung';
import DinhMucChoHang from './components/DinhMucChoHang';
import DinhMucVoRong from './components/DinhMucVoRong';
import DinhMucDiDuong from './components/DinhMucDiDuong';
import { useDinhMucDauManagement } from '@/hooks/useDinhMucDauManagement';

const QuanLyDinhMuc = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { supplementaryStandard, handleSaveSupplementary } = useDinhMucDauManagement();

  // Determine the active tab based on the current path
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/bo-sung')) return 'bo-sung';
    if (path.includes('/cho-hang')) return 'cho-hang';
    if (path.includes('/vo-rong')) return 'vo-rong';
    if (path.includes('/di-duong')) return 'di-duong';
    return 'bo-sung'; // Default tab
  };

  const activeTab = getActiveTab();

  // Redirect to the default tab if no specific tab is selected
  useEffect(() => {
    if (location.pathname === '/dinh-muc') {
      navigate('/dinh-muc/bo-sung', { replace: true });
    }
  }, [location.pathname, navigate]);

  const handleTabChange = (event, newValue) => {
    navigate(`/dinh-muc/${newValue}`);
  };

  return (
    <Box sx={{ width: '100%', p: 0 }}>


      <Paper sx={{ width: '100%', mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="định mức tabs"
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile={isMobile}
            sx={{
              '& .MuiTabs-scrollButtons': {
                opacity: 1,
                '&.Mui-disabled': { opacity: 0.3 },
              },
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.95rem',
                minWidth: 100,
                '&.Mui-selected': {
                  color: theme.palette.primary.main,
                  fontWeight: 600,
                },
              },
            }}
            TabIndicatorProps={{
              style: {
                backgroundColor: theme.palette.primary.main,
              },
            }}
          >
            <Tab label="Bổ Sung" value="bo-sung" />
            <Tab label="Chở hàng" value="cho-hang" />
            <Tab label="Vỏ rỗng" value="vo-rong" />
            <Tab label="Đi đường" value="di-duong" />
          </Tabs>
        </Box>
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Routes>
          <Route
            path="bo-sung"
            element={
              <DinhMucBoSung
                supplementaryStandard={supplementaryStandard}
                onSaveSupplementary={handleSaveSupplementary}
              />
            }
          />
          <Route path="cho-hang" element={<DinhMucChoHang />} />
          <Route path="vo-rong" element={<DinhMucVoRong />} />
          <Route path="di-duong" element={<DinhMucDiDuong />} />
          <Route path="*" element={<Navigate to="bo-sung" replace />} />
        </Routes>
      </Box>
    </Box>
  );
};

export default QuanLyDinhMuc;
