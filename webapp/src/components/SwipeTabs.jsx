import React, { useCallback } from 'react';
import Tabs from './Tabs';
import SwipeDetector from './SwipeDetector';
import PropTypes from 'prop-types';

/**
 * SwipeTabs - Tabs component with swipe gesture support
 * @param {Array} tabs - Array of tab objects with { value, label }
 * @param {string} activeTab - Current active tab value
 * @param {string} basePath - Base path for navigation (e.g., '/phuong-tien', '/dinh-muc')
 * @param {Function} onTabChange - Optional callback for tab change
 * @param {React.ReactNode} children - Tab panel content
 */
const SwipeTabs = ({ 
  tabs, 
  activeTab, 
  basePath, 
  onTabChange,
  children,
  className = '' 
}) => {
  const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab);

  const handleSwipeLeft = useCallback(() => {
    if (currentTabIndex < tabs.length - 1) {
      const nextTab = tabs[currentTabIndex + 1].value;
      if (onTabChange) {
        onTabChange(nextTab);
      }
    }
  }, [currentTabIndex, tabs, onTabChange]);

  const handleSwipeRight = useCallback(() => {
    if (currentTabIndex > 0) {
      const prevTab = tabs[currentTabIndex - 1].value;
      if (onTabChange) {
        onTabChange(prevTab);
      }
    }
  }, [currentTabIndex, tabs, onTabChange]);

  return (
    <div className={`w-full flex flex-col h-full ${className}`}>
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        basePath={basePath}
        onTabChange={onTabChange}
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
      />
      
      <SwipeDetector 
        onSwipeLeft={handleSwipeLeft} 
        onSwipeRight={handleSwipeRight}
        className="flex-1 overflow-y-auto"
      >
        {children}
      </SwipeDetector>
    </div>
  );
};

SwipeTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  basePath: PropTypes.string.isRequired,
  onTabChange: PropTypes.func,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default SwipeTabs;
