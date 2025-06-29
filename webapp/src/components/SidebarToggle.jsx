import React from 'react';
import { useModalVisibility } from '@hooks/useModalVisibility';

const SidebarToggle = ({
  type = "desktop", // "desktop" | "mobile"
  onClick,
  isCollapsed = false,
  isOpen = false,
  hideOnModal = true,
  className = "",
  style = {},
  ariaLabel,
  ...props
}) => {
  const { hasActiveModal } = useModalVisibility();
  
  // Hide when modal is active (if enabled)
  if (hideOnModal && hasActiveModal) {
    return null;
  }

  if (type === "mobile") {
    return (
      <button
        className={`relative md:hidden mr-3 p-2 rounded hover:bg-black/10 focus:outline-none transition-all duration-300 ${className}`}
        onClick={onClick}
        aria-label={ariaLabel || (isOpen ? 'Đóng menu' : 'Mở menu')}
        style={style}
        {...props}
      >
        {/* Hamburger Icon */}
        <svg
          className={`h-6 w-6 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-0' : 'opacity-100'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        {/* X Icon */}
        <svg
          className={`h-6 w-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    );
  }

  // Desktop version
  return (
    <button
      onClick={onClick}
      className={`hidden md:flex fixed bottom-16 z-50 w-6 h-12 bg-gray-200 hover:bg-gray-300 border border-gray-300 rounded-r-md items-center justify-center transition-all duration-300 ease-in-out ${
        isCollapsed ? 'left-0' : 'left-64'
      } ${className}`}
      aria-label={ariaLabel || (isCollapsed ? 'Mở sidebar' : 'Thu gọn sidebar')}
      style={style}
      {...props}
    >
      <svg
        className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
          isCollapsed ? 'rotate-0' : 'rotate-180'
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
};

export default SidebarToggle;