// NEPO-8: dải lọc đội xe chỉ còn 3 tab (Tất cả / Đang chạy / Chưa giao) — 6 tab cũ
// tràn ngang và sinh scrollbar trong card. Bộ test này chốt đúng 3 tab đó; các tab
// đã bỏ (Sẵn sàng / Chờ tài xế / Bảo dưỡng) không được quay lại âm thầm.

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DispatchFilters } from './DispatchFilters';
import type { FleetFilter } from '../utils';

afterEach(cleanup);

function renderFilters(filter: FleetFilter = 'all', counts = { all: 12, running: 5, noassign: 3 }) {
  const onFilterChange = vi.fn();
  render(<DispatchFilters fleetFilter={filter} fleetCounts={counts} onFilterChange={onFilterChange} />);
  return { onFilterChange };
}

function tabButtons(): HTMLElement[] {
  return Array.from(
    screen.getByRole('group', { name: 'Lọc trạng thái đội xe' }).querySelectorAll('button'),
  );
}

function tabLabels(): string[] {
  return tabButtons().map((button) => button.textContent?.replace(/\s+/g, ' ').trim() ?? '');
}

describe('DispatchFilters (NEPO-8)', () => {
  it('renders exactly three tabs — Tất cả, Đang chạy, Chưa giao — in that order', () => {
    renderFilters();

    expect(tabLabels()).toEqual(['Tất cả 12', 'Đang chạy 5', 'Chưa giao 3']);
  });

  it('does not render the retired Sẵn sàng / Chờ tài xế / Bảo dưỡng tabs', () => {
    renderFilters();

    for (const retired of ['Sẵn sàng', 'Chờ tài xế', 'Bảo dưỡng']) {
      expect(screen.queryByText(new RegExp(`^${retired}\\b`))).toBeNull();
    }
  });

  it('marks the active tab and reports the clicked filter key', () => {
    const { onFilterChange } = renderFilters('all');
    const [allTab, runningTab] = tabButtons();

    expect(allTab.getAttribute('aria-pressed')).toBe('true');
    expect(runningTab.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(runningTab);
    expect(onFilterChange).toHaveBeenCalledWith('running');
  });
});
