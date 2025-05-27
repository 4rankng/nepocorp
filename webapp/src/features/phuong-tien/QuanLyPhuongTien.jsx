import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tabs, Tab, Box, useTheme, useMediaQuery } from '@mui/material';
import { TabContext, TabPanel } from '@mui/lab';
import { useNavigate, useParams } from 'react-router-dom';
import VanChuyen from '@/features/phuong-tien/VanChuyen';
import DinhMuc from '@/features/phuong-tien/DinhMuc';
import BaoDuong from '@/features/phuong-tien/BaoDuong';

// Define valid tabs and their labels
const TABS = [
  { value: 'van-chuyen', label: 'Vận Chuyển' },
  { value: 'dinh-muc', label: 'Định Mức' },
  { value: 'bao-duong', label: 'Bảo Dưỡng' },
];

// SwipeDetector component for handling touch events
const SwipeDetector = ({ children, onSwipeLeft, onSwipeRight }) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback(e => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  }, []);

  const handleTouchEnd = useCallback(
    e => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Only process horizontal swipes (ignore vertical scrolling)
      if (Math.abs(deltaY) > Math.abs(deltaX)) return;

      const minDistance = 50;
      if (Math.abs(deltaX) > minDistance) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    },
    [onSwipeLeft, onSwipeRight]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal swipes
      }}
    >
      {children}
    </Box>
  );
};

const QuanLyPhuongTien = () => {
  const { tab: tabFromUrl = 'van-chuyen' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const tabsRef = useRef(null);

  // Set the active tab based on URL parameter
  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : 'van-chuyen';
  const currentTabIndex = TABS.findIndex(tab => tab.value === activeTab);

  // Redirect to the first tab if the current tab is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/phuong-tien/van-chuyen`, { replace: true });
    }
  }, [tabFromUrl, navigate]);

  // Center the active tab when it changes
  useEffect(() => {
    if (tabsRef.current && currentTabIndex !== -1) {
      const tabElement = tabsRef.current.querySelector(`[data-value="${activeTab}"]`);
      if (tabElement) {
        tabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeTab, currentTabIndex]);

  const handleTabChange = (event, newValue) => {
    navigate(`/phuong-tien/${newValue}`);
  };

  // Handle swipe gestures - navigate to next/previous tab
  const handleSwipeLeft = useCallback(() => {
    // Swipe left = go to next tab (if not on last tab)
    if (currentTabIndex < TABS.length - 1) {
      const nextTab = TABS[currentTabIndex + 1].value;
      navigate(`/phuong-tien/${nextTab}`);
    }
  }, [currentTabIndex, navigate]);

  const handleSwipeRight = useCallback(() => {
    // Swipe right = go to previous tab (if not on first tab)
    if (currentTabIndex > 0) {
      const prevTab = TABS[currentTabIndex - 1].value;
      navigate(`/phuong-tien/${prevTab}`);
    }
  }, [currentTabIndex, navigate]);

  return (
    <SwipeDetector onSwipeLeft={handleSwipeLeft} onSwipeRight={handleSwipeRight}>
      <Box className="p-6">
        <h1 className="text-2xl font-bold mb-6">Quản Lý Phương Tiện</h1>

        <Box sx={{ width: '100%', typography: 'body1' }}>
          <TabContext value={activeTab}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                ref={tabsRef}
                value={activeTab}
                onChange={handleTabChange}
                scrollButtons="auto"
                aria-label="Quản lý phương tiện tabs"
                sx={{
                  '& .MuiTabs-scrollButtons': {
                    opacity: 1,
                    '&.Mui-disabled': { opacity: 0.3 },
                  },
                  '& .MuiTabs-indicator': {
                    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                  },
                  '& .MuiTabs-flexContainer': {
                    justifyContent: 'flex-start',
                  },
                }}
                TabIndicatorProps={{
                  children: <span className="MuiTabs-indicatorSpan" />,
                }}
              >
                {TABS.map(tab => (
                  <Tab
                    key={tab.value}
                    label={tab.label}
                    value={tab.value}
                    disableRipple
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      textTransform: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      transition: 'color 0.3s ease-in-out',
                      '&.Mui-selected': {
                        color: 'primary.main',
                        fontWeight: 600,
                      },
                    }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Tab content with swipe support */}
            <Box
              sx={{
                position: 'relative',
                minHeight: '60vh',
                overflow: 'hidden',
              }}
            >
              <TabPanel value="van-chuyen" sx={{ p: 0, mt: 2 }}>
                <VanChuyen />
              </TabPanel>
              <TabPanel value="dinh-muc" sx={{ p: 0, mt: 2 }}>
                <DinhMuc />
              </TabPanel>
              <TabPanel value="bao-duong" sx={{ p: 0, mt: 2 }}>
                <BaoDuong />
              </TabPanel>
            </Box>
          </TabContext>
        </Box>
      </Box>
    </SwipeDetector>
  );
};

export default QuanLyPhuongTien;
