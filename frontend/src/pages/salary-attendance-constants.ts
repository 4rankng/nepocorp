// Calendar labels + work-day status config for the salary-attendance screen.
// Split out of `salary-attendance-components.tsx` so that module exports only
// components (React Fast Refresh).

import { Truck, Coffee, XCircle, Moon } from 'lucide-react';

export const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

// Palette note (NEPO-7 + NEPO-9): bg/color must match the calendar cell and
// legend palettes in salary-attendance/calendar.css + responsive.css exactly —
// one status = one color on every surface (cell, list badge, strip, legend).
// App is light-only (prefersdark: false), so hex is safe here.
export const STATUS_CONFIG = {
  TRIP_DAY:      { label: 'Đi chuyến',    bg: '#F3FAF6', color: '#12693A',   icon: Truck,   emoji: '🚛' },
  STANDBY:       { label: 'Chờ việc',     bg: '#F4F6F5', color: '#46554D',   icon: Coffee,  emoji: '⏳' },
  PERSONAL_LEAVE:{ label: 'Nghỉ riêng',   bg: '#FDF4F5', color: '#9E1035',   icon: XCircle, emoji: '🏖' },
  WEEKLY_OFF:    { label: 'Nghỉ tuần',    bg: '#F4F6F5', color: 'var(--ink-3)', icon: Moon, emoji: '💤' },
};
