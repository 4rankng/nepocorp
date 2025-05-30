import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * Tabs - A reusable tab component with consistent styling
 * @param {Array} tabs - Array of tab objects with { value, label }
 * @param {string} activeTab - Current active tab value
 * @param {string} basePath - Base path for navigation (e.g., '/phuong-tien', '/dinh-muc')
 * @param {Function} onTabChange - Optional callback for tab change
 * @param {Function} onSwipeLeft - Optional callback for swipe left
 * @param {Function} onSwipeRight - Optional callback for swipe right
 */
const CommonTabs = ({
  tabs,
  activeTab,
  basePath,
  onTabChange,
  onSwipeLeft,
  onSwipeRight,
  className = '',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = tabValue => {
    const newPath = `${basePath}/${tabValue}`;
    navigate(newPath);

    if (onTabChange) {
      onTabChange(tabValue);
    }
  };

  const currentTabIndex = tabs.findIndex(tab => tab.value === activeTab);

  const handleSwipeLeftInternal = () => {
    if (currentTabIndex < tabs.length - 1) {
      const nextTab = tabs[currentTabIndex + 1].value;
      handleTabClick(nextTab);
    }
    if (onSwipeLeft) {
      onSwipeLeft();
    }
  };

  const handleSwipeRightInternal = () => {
    if (currentTabIndex > 0) {
      const prevTab = tabs[currentTabIndex - 1].value;
      handleTabClick(prevTab);
    }
    if (onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div className={`w-full bg-white border-b border-gray-200 ${className}`}>
      <div className="flex overflow-x-auto scrollbar-hide">
        <div className="flex space-x-1 p-2 min-w-full">
          {tabs.map(tab => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleTabClick(tab.value)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ease-in-out relative whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-100 text-slate-800 shadow-sm border-b-2 border-slate-400'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
                }`}
              >
                {/* Label */}
                <span className="relative z-10 tracking-wide">{tab.label}</span>

                {/* Active indicator dot */}
                <div
                  className={`absolute top-2 right-2 w-2 h-2 bg-slate-400 rounded-full transition-all duration-300 ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                  }`}
                ></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Swipe indicators for mobile (optional) */}
      <div className="flex justify-center space-x-1 py-2 md:hidden">
        {tabs.map((tab, index) => (
          <div
            key={tab.value}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentTabIndex ? 'bg-slate-400' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

CommonTabs.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeTab: PropTypes.string.isRequired,
  basePath: PropTypes.string.isRequired,
  onTabChange: PropTypes.func,
  onSwipeLeft: PropTypes.func,
  onSwipeRight: PropTypes.func,
  className: PropTypes.string,
};

export default CommonTabs;
