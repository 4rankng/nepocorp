import React from 'react';
import Button from '../Button';

const TransportButtons = ({
  onCreateSchedule,
  onViewCalendar,
  onDownload,
  createScheduleText = 'Tạo lịch vận chuyển',
  viewCalendarText = 'Xem lịch',
  downloadText = 'Tải xuống',
  disabled = false,
  size = 'medium',
  className = '',
  ...props
}) => {
  const TruckIcon = () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
    </svg>
  );

  const CalendarIcon = () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
      />
    </svg>
  );

  const DownloadIcon = () => (
    <svg className="icon" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
      <path
        fillRule="evenodd"
        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
      />
    </svg>
  );

  return (
    <div className={`transport-buttons ${className}`} {...props}>
      {onCreateSchedule && (
        <Button
          variant="primary"
          size={size}
          onClick={onCreateSchedule}
          disabled={disabled}
          icon={<TruckIcon />}
        >
          {createScheduleText}
        </Button>
      )}
      {onViewCalendar && (
        <Button
          variant="secondary"
          size={size}
          onClick={onViewCalendar}
          disabled={disabled}
          icon={<CalendarIcon />}
        >
          {viewCalendarText}
        </Button>
      )}
      {onDownload && (
        <Button
          variant="ghost"
          size={size}
          onClick={onDownload}
          disabled={disabled}
          icon={<DownloadIcon />}
        >
          {downloadText}
        </Button>
      )}
    </div>
  );
};

export default TransportButtons;
