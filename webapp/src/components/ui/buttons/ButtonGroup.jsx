import React from 'react';
import './ButtonGroup.css';

const ButtonGroup = ({
  children,
  gap = 'medium',
  direction = 'horizontal',
  wrap = true,
  align = 'start',
  justify = 'start',
  className = '',
  ...props
}) => {
  const classes = [
    'button-group',
    `button-group--${direction}`,
    `button-group--gap-${gap}`,
    `button-group--align-${align}`,
    `button-group--justify-${justify}`,
    wrap && 'button-group--wrap',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default ButtonGroup;
