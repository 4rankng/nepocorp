import { render, screen } from '@testing-library/react';
import { TripStatus } from '@tingting/shared';
import { describe, expect, it, vi } from 'vitest';
import { TripFiltersBar, defaultStatusCounts } from './tripFilters';

describe('TripFiltersBar', () => {
  it('keeps only the three actionable controls in the filter row', () => {
    const { container } = render(
      <TripFiltersBar
        statusCounts={defaultStatusCounts()}
        statusFilter={TripStatus.COMPLETED}
        onStatusFilter={vi.fn()}
        searchQuery="-0014"
        onSearch={vi.fn()}
        truckOptions={[]}
        truckFilter=""
        onTruckFilter={vi.fn()}
        customerOptions={[]}
        customerFilter=""
        onCustomerFilter={vi.fn()}
      />,
    );

    const filterRow = container.querySelector('.filters-row-bottom');

    expect(filterRow?.children).toHaveLength(3);
    expect(screen.getByRole('textbox', { name: 'Tìm chuyến đi' })).toBeTruthy();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
    expect(screen.queryByText('Đang tìm trên tất cả tháng')).toBeNull();
  });
});
