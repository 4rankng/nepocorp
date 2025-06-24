import { forwardRef } from 'react';

export const PlusIcon = forwardRef(({ className = 'w-6 h-6', ...props }, ref) => (
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
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
));

PlusIcon.displayName = 'PlusIcon';
export default PlusIcon;