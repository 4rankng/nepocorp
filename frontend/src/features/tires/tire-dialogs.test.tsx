import type { Tire } from '@tingting/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TransferTireDialog } from './tire-dialogs';

const tire: Tire = {
  id: 1,
  serial: 'TL-001',
  truckId: 3,
  trailerId: null,
  position: 'Trục trước',
  size: '315/80R22.5',
  installedAt: '2026-01-01',
  removedAt: null,
  supplierId: null,
  cost: '5000000',
  purchasedAt: '2026-01-01',
  disposalDate: null,
  disposalReason: null,
  status: 'IN_USE',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  deletedAt: null,
};

describe('TransferTireDialog rơ-moóc rows', () => {
  /**
   * The target-vehicle dropdown lists trailers bare, so staff could not tell
   * which tractor holds each one when moving a tire (kanban 091026010130).
   */
  it('labels each rơ-moóc option with the paired tractor and falls back for unpaired trailers', () => {
    render(
      <TransferTireDialog
        tire={tire}
        tires={[]}
        vehicles={[
          { id: 1, kind: 'trailer', label: '15R-070.51', tractorPlate: '15C-139.82' },
          { id: 2, kind: 'trailer', label: '15R-050.37', tractorPlate: null },
        ]}
        currentVehicleLabel="15C-136.31"
        positionLabels={[]}
        saving={false}
        onManagePositions={vi.fn()}
        oncancel={vi.fn()}
        ontransfer={vi.fn()}
      />,
    );

    const rows = screen.getAllByRole('option').map(o => o.textContent ?? '');
    const paired = rows.find(r => r.includes('15R-070.51'));
    const unpaired = rows.find(r => r.includes('15R-050.37'));

    expect(paired).toContain('đang ghép 15C-139.82');
    expect(unpaired).toContain('trống');
  });
});
