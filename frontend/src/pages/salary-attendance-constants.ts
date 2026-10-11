// Calendar labels + work-day status config for the salary-attendance screen.
// Split out of `salary-attendance-components.tsx` so that module exports only
// components (React Fast Refresh).

import { Truck, Coffee, XCircle, Moon } from 'lucide-react';

export const DOW_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const STATUS_CONFIG = {
  TRIP_DAY:      { label: 'Đi chuyến',    bg: 'var(--accent-soft)',  color: 'var(--success-text)', icon: Truck,   emoji: '🚛' },
  STANDBY:       { label: 'Chờ việc',     bg: 'var(--warning-soft)', color: 'var(--warning-text)', icon: Coffee,  emoji: '⏳' },
  PERSONAL_LEAVE:{ label: 'Nghỉ riêng',   bg: 'var(--danger-soft)',  color: 'var(--danger-text)',  icon: XCircle, emoji: '🏖' },
  WEEKLY_OFF:    { label: 'Nghỉ tuần',    bg: 'var(--bg-3)',         color: 'var(--ink-2)',        icon: Moon,    emoji: '💤' },
};
