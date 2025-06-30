import { forwardRef } from 'react';

export const ChevronUpIcon = forwardRef(({ className = 'w-5 h-5', ...props }, ref) => (
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
));

ChevronUpIcon.displayName = 'ChevronUpIcon';
export default ChevronUpIcon;
