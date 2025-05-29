import React, { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Box,
  Tab,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Tabs as MuiTabs,
} from '@mui/material'; // Renamed Tabs to MuiTabs to avoid conflict
import { TabContext, TabList, TabPanel } from '@mui/lab';
import SwipeDetector from '../../components/SwipeDetector';
import DinhMucBoSung from './components/DinhMucBoSung';
import DinhMucChoHang from './components/DinhMucChoHang';
import DinhMucVoRong from './components/DinhMucVoRong';
import DinhMucDiDuong from './components/DinhMucDiDuong';
import { useDinhMucDauManagement } from '@/hooks/useDinhMucDauManagement';

const TABS = [
  { value: 'bo-sung', label: 'Bổ Sung' },
  { value: 'cho-hang', label: 'Chở hàng' },
  { value: 'vo-rong', label: 'Vỏ rỗng' },
  { value: 'di-duong', label: 'Đi đường' },
];

const QuanLyDinhMuc = () => {
  const { tab: tabFromUrl = TABS[0].value } = useParams();
  const navigate = useNavigate();
  const location = useLocation(); // Keep for potential future use, though not strictly necessary for current tab logic
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const tabsRef = useRef(null);

  const { supplementaryStandard, handleSaveSupplementary } = useDinhMucDauManagement();

  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : TABS[0].value;
  const currentTabIndex = TABS.findIndex(tab => tab.value === activeTab);

  // Redirect to the default tab if the current tab from URL is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/dinh-muc/${TABS[0].value}`, { replace: true });
    }
  }, [tabFromUrl, navigate]);

  // Center the active tab when it changes (for non-mobile)
  useEffect(() => {
    if (tabsRef.current && currentTabIndex !== -1 && !isMobile) {
      const tabList = tabsRef.current.querySelector('.MuiTabs-flexContainer');
      if (tabList) {
        const activeTabElement = tabList.children[currentTabIndex];
        if (activeTabElement) {
          activeTabElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      }
    }
  }, [activeTab, currentTabIndex, isMobile]);

  const handleTabChange = (event, newValue) => {
    navigate(`/dinh-muc/${newValue}`);
  };

  const handleSwipeLeft = useCallback(() => {
    if (currentTabIndex < TABS.length - 1) {
      const nextTab = TABS[currentTabIndex + 1].value;
      navigate(`/dinh-muc/${nextTab}`);
    }
  }, [currentTabIndex, navigate]);

  const handleSwipeRight = useCallback(() => {
    if (currentTabIndex > 0) {
      const prevTab = TABS[currentTabIndex - 1].value;
      navigate(`/dinh-muc/${prevTab}`);
    }
  }, [currentTabIndex, navigate]);

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TabContext value={activeTab}>
        <Paper sx={{ width: '100%', mb: isMobile ? 1 : 2, flexShrink: 0 }} elevation={1}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }} ref={tabsRef}>
            <TabList
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
                  minWidth: isMobile ? 80 : 100, // Adjust minWidth for mobile
                  padding: isMobile ? '12px 8px' : '12px 16px',
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
              {TABS.map(tab => (
                <Tab key={tab.value} label={tab.label} value={tab.value} />
              ))}
            </TabList>
          </Box>
        </Paper>

        <SwipeDetector onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
          <Box
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              p: isMobile ? 1 : 2,
              mt: 0 /* Reset margin top as TabPanel handles padding */,
            }}
          >
            <TabPanel value={TABS[0].value} sx={{ p: 0 }}>
              <DinhMucBoSung
                supplementaryStandard={supplementaryStandard}
                onSaveSupplementary={handleSaveSupplementary}
              />
            </TabPanel>
            <TabPanel value={TABS[1].value} sx={{ p: 0 }}>
              <DinhMucChoHang />
            </TabPanel>
            <TabPanel value={TABS[2].value} sx={{ p: 0 }}>
              <DinhMucVoRong />
            </TabPanel>
            <TabPanel value={TABS[3].value} sx={{ p: 0 }}>
              <DinhMucDiDuong />
            </TabPanel>
          </Box>
        </SwipeDetector>
      </TabContext>
    </Box>
  );
};

export default QuanLyDinhMuc;
