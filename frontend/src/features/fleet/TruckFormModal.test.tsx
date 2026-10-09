import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TruckFormModal } from './TruckFormModal';

describe('TruckFormModal', () => {
  it('keeps vehicle identity editing separate from canonical schedules', () => {
    render(
      <TruckFormModal
        saving={false}
        trailers={[]}
        onsave={vi.fn()}
        oncancel={vi.fn()}
        isOpen
      />,
    );

    expect(screen.getByLabelText('Biển số xe đầu kéo *')).toBeTruthy();
    expect(screen.queryByText('Mốc nhắc việc')).toBeNull();
    expect(screen.queryByLabelText('Hạn đăng kiểm')).toBeNull();
    expect(screen.queryByLabelText('Hạn bảo hiểm')).toBeNull();
    expect(screen.queryByLabelText('Thay dầu kế tiếp')).toBeNull();
  });

  /**
   * The pairing is decided in THIS dialog, and the bare "plate (type)" list made
   * it easy to attach a trailer that is already out on a run (kanban
   * 091026010130). The list/detail views already showed the pairing; the
   * picker did not.
   */
  it('labels each trailer option with the tractor it is hooked to', () => {
    render(
      <TruckFormModal
        saving={false}
        trailers={[
          { id: 1, licensePlate: '15R-070.51', type: 'FT40' },
          { id: 2, licensePlate: '15R-050.37', type: 'FT40' },
        ]}
        trucks={[
          { id: 3, licensePlate: '15C-139.82', currentTrailerId: 1 },
          { id: 4, licensePlate: '15C-180.99', currentTrailerId: null },
        ]}
        onsave={vi.fn()}
        oncancel={vi.fn()}
        isOpen
      />,
    );

    const options = Array.from(
      (screen.getByLabelText('Rơ-moóc hiện tại') as HTMLSelectElement).options,
    ).map(o => o.textContent);

    expect(options[1]).toContain('15R-070.51');
    expect(options[1]).toContain('đang ghép 15C-139.82');
    // An unpaired trailer must read as free, not as missing information.
    expect(options[2]).toContain('15R-050.37');
    expect(options[2]).toContain('trống');
  });
});
