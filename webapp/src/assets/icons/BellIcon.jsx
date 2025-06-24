import { forwardRef } from 'react';

export const BellIcon = forwardRef(({ className = 'w-6 h-6', ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13.73 21a2 2 0 0 1-3.46 0"
    />
  </svg>
));

BellIcon.displayName = 'BellIcon';
export default BellIcon;