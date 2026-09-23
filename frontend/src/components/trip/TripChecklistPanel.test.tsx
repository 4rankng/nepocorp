import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TripChecklistPanel } from './TripChecklistPanel';

const form = vi.hoisted(() => ({
  totalRequiredFields: 7,
  completionStatus: { mainInfo: 7, journey: 2, fuelRevenue: 9, fuelRevenueTotal: 9, images: 2, imagesTotal: 2 },
}));
vi.mock('../../hooks/useTripFormContext', () => ({ useTripFormContext: () => form }));

describe('trip checklist panel', () => {
  it('reports fuel & revenue progress against its own set, never past it', () => {
    // The badge used to be hardcoded "…/8" while the completion set has nine
    // items, so a fully filled form rendered "9/8".
    render(<TripChecklistPanel />);

    expect(screen.getByText('9/9')).toBeTruthy();
    expect(screen.queryByText('9/8')).toBeNull();
  });

  it('marks the main-info row done once every required field is filled', () => {
    render(<TripChecklistPanel />);

    expect(screen.getByText('✓')).toBeTruthy();
  });
});
