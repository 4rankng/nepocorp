import { forwardRef } from 'react';

export const ChevronDownIcon = forwardRef(({ className = 'w-5 h-5', ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    {...props}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
));

ChevronDownIcon.displayName = 'ChevronDownIcon';
export default ChevronDownIcon;