import React from 'react';
import { Button } from '@mui/material';
import { PlusIcon } from '@heroicons/react/24/outline';

const AddButton = ({
  onClick,
  disabled = false,
  children,
  size = 'medium',
  className = '',
  ...props
}) => {
  return (
    <Button
      variant="contained"
      onClick={onClick}
      disabled={disabled}
      size={size}
      className={`bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
      {...props}
    >
      <PlusIcon className="w-5 h-5" />
      {children && <span className="ml-2">{children}</span>}
    </Button>
  );
};

export default AddButton;
