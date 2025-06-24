import { forwardRef } from 'react';

export const OilIcon = forwardRef(({ className = 'w-6 h-6', ...props }, ref) => (
  <svg
    ref={ref}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v2.25M12 21c-3.866 0-7-3.134-7-7 0-2.485 2.5-6.5 7-11 4.5 4.5 7 8.515 7 11 0 3.866-3.134 7-7 7z"
    />
    <ellipse
      cx="15.2"
      cy="8.5"
      rx="2.1"
      ry="1.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      opacity="0.6"
      transform="rotate(-18 15.2 8.5)"
    />
  </svg>
));

OilIcon.displayName = 'OilIcon';
export default OilIcon;