import { forwardRef } from 'react';

export const ArrowRightIcon = forwardRef(({ className = 'w-5 h-5', ...props }, ref) => (
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
));

ArrowRightIcon.displayName = 'ArrowRightIcon';
export default ArrowRightIcon;