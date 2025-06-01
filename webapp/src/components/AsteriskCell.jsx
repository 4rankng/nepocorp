import { Typography } from '@mui/material';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

/**
 * A reusable cell component that shows a tooltip when the value is an asterisk (*).
 * @param {Object} props - Component props
 * @param {string} props.value - The cell value to display
 * @param {string} [props.tooltip='Áp dụng cho tất cả'] - The tooltip text to show when value is '*'
 * @returns {JSX.Element} The rendered component
 */
const AsteriskCell = ({ value, tooltip = 'Áp dụng cho tất cả' }) => {
  if (value === '*') {
    return (
      <Tippy content={tooltip} placement="top" delay={[300, 0]}>
        <Typography
          variant="body2"
          fontWeight={500}
          sx={{
            color: 'primary.main',
            cursor: 'help',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted',
            textUnderlineOffset: '2px',
          }}
        >
          {value}
        </Typography>
      </Tippy>
    );
  }
  return (
    <Typography variant="body2" fontWeight={500}>
      {value}
    </Typography>
  );
};

export default AsteriskCell;
