import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Tabs, Tab, Box, useTheme, useMediaQuery } from '@mui/material';
import { TabContext, TabPanel } from '@mui/lab';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import XeVanChuyen from '@features/phuong-tien/components/XeVanChuyen';
import LoaiContainer from '@features/phuong-tien/components/LoaiContainer';
import DinhMucDau from '@features/phuong-tien/components/DinhMucDau';
import BaoDuong from '@features/phuong-tien/components/BaoDuong';

// Define valid tabs and their labels
const TABS = [
  { value: 'xe-van-chuyen', label: 'Xe Vận Chuyển' },
  { value: 'loai-container', label: 'Loại Container' },
  { value: 'dinh-muc-dau', label: 'Định Mức Dầu' },
  { value: 'bao-duong', label: 'Bảo Dưỡng' },
];

// SwipeDetector component for handling touch events
const SwipeDetector = ({ children, onSwipeLeft, onSwipeRight, isAnimating }) => {
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback(
    e => {
      if (isAnimating) return;
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      setSwipeOffset(0);
    },
    [isAnimating]
  );

  const handleTouchMove = useCallback(
    e => {
      if (isAnimating) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Only handle horizontal swipes (with 2:1 ratio)
      if (Math.abs(deltaY) > Math.abs(deltaX) * 0.5) return;

      e.preventDefault();
      setSwipeOffset(deltaX);
    },
    [isAnimating]
  );

  const handleTouchEnd = useCallback(
    e => {
      if (isAnimating) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      // Reset visual feedback
      setSwipeOffset(0);

      // Only process horizontal swipes
      if (Math.abs(deltaY) > Math.abs(deltaX) * 0.5) return;

      const minDistance = 50;
      if (Math.abs(deltaX) > minDistance) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    },
    [isAnimating, onSwipeLeft, onSwipeRight]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        touchAction: 'pan-y',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
        '& *': { pointerEvents: 'auto' },
      }}
    >
      {/* Visual feedback for swipe */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            swipeOffset > 0
              ? `linear-gradient(to right, rgba(0,0,0,0.05) ${Math.abs(swipeOffset) / 2}%, transparent)`
              : `linear-gradient(to left, rgba(0,0,0,0.05) ${Math.abs(swipeOffset) / 2}%, transparent)`,
          pointerEvents: 'none',
          opacity: Math.min(Math.abs(swipeOffset) / 100, 0.3),
          transition: swipeOffset === 0 ? 'opacity 0.2s ease-out' : 'none',
          zIndex: 1,
        }}
      />
      {children}
    </Box>
  );
};

const QuanLyPhuongTien = () => {
  const { tab: tabFromUrl = 'xe-van-chuyen' } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef(null);

  // Set the active tab based on URL parameter
  const activeTab = TABS.some(tab => tab.value === tabFromUrl) ? tabFromUrl : 'xe-van-chuyen';
  const currentTabIndex = TABS.findIndex(tab => tab.value === activeTab);

  // Redirect to the first tab if the current tab is invalid
  useEffect(() => {
    if (!TABS.some(tab => tab.value === tabFromUrl)) {
      navigate(`/phuong-tien/xe-van-chuyen`, { replace: true });
    }
  }, [tabFromUrl, navigate]);

  const handleTabChange = (event, newValue) => {
    navigate(`/phuong-tien/${newValue}`);
  };

  // Handle tab navigation with animation
  const navigateToTab = useCallback(
    direction => {
      const currentIndex = TABS.findIndex(tab => tab.value === activeTab);
      const newIndex = currentIndex + direction;

      if (newIndex >= 0 && newIndex < TABS.length) {
        setIsAnimating(true);
        navigate(`/phuong-tien/${TABS[newIndex].value}`);
        setTimeout(() => setIsAnimating(false), 200);
        return true;
      }
      return false;
    },
    [activeTab, navigate]
  );

  // Handle swipe gestures
  const handleSwipeLeft = useCallback(() => {
    navigateToTab(1);
  }, [navigateToTab]);

  const handleSwipeRight = useCallback(() => {
    navigateToTab(-1);
  }, [navigateToTab]);

  return (
    <Box className="p-6" ref={containerRef}>
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
              sx={{
                '& .MuiTabs-scrollButtons': {
                  opacity: 1,
                  '&.Mui-disabled': { opacity: 0.3 },
                },
              }}
            >
              {TABS.map(tab => (
                <Tab key={tab.value} label={tab.label} value={tab.value} />
              ))}
            </Tabs>
          </Box>

          {/* Swipeable container for mobile */}
          <SwipeDetector
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            isAnimating={isAnimating}
          >
            <Box
              sx={{
                position: 'relative',
                minHeight: '60vh',
                touchAction: 'pan-y',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                '& *': { pointerEvents: 'auto' },
                animation: 'edgePulse 0.3s ease-out',
              }}
            >
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
            </Box>
          </SwipeDetector>
        </TabContext>
      </Box>
    </Box>
  );
};

export default QuanLyPhuongTien;
