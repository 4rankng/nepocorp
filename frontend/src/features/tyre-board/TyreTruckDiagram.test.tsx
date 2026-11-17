import type { TyreBoardSlot } from '@tingting/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TyreTruckDiagram } from './TyreTruckDiagram';

const slot = (position: number, serial: string | null = null): TyreBoardSlot => ({
  position,
  brand: null,
  size: null,
  treadType: null,
  serial,
  model: null,
  lastChangedAt: null,
  note: null,
});

const allSlots = (): TyreBoardSlot[] => Array.from({ length: 22 }, (_, i) => slot(i + 1));

describe('TyreTruckDiagram', () => {
  it('renders one serial input per position, 1–22, in the horizontal variant', () => {
    render(<TyreTruckDiagram slots={allSlots()} vertical={false} onSerialCommit={vi.fn()} />);

    for (let n = 1; n <= 22; n++) {
      expect(screen.getByLabelText(`Số seri ô ${n}`)).toBeTruthy();
    }
  });

  it('commits a typed serial for exactly one position on blur', () => {
    const onSerialCommit = vi.fn();
    render(<TyreTruckDiagram slots={allSlots()} vertical={false} onSerialCommit={onSerialCommit} />);

    const input = screen.getByLabelText('Số seri ô 5') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TL-123456' } });
    fireEvent.blur(input);

    expect(onSerialCommit).toHaveBeenCalledTimes(1);
    expect(onSerialCommit).toHaveBeenCalledWith(5, 'TL-123456');
  });

  it('draws spare positions 7–10 with the dashed spare class, non-spares without', () => {
    const { container } = render(<TyreTruckDiagram slots={allSlots()} vertical={false} onSerialCommit={vi.fn()} />);

    const spareGroups = container.querySelectorAll('g.tbp-svg-marker--spare');
    expect(spareGroups.length).toBe(4);
    const sparePositions = [...spareGroups].map(g => Number(g.getAttribute('data-position'))).sort((a, b) => a - b);
    expect(sparePositions).toEqual([7, 8, 9, 10]);

    for (const n of [1, 5, 11, 22]) {
      expect(container.querySelector(`g[data-position="${n}"]`)?.classList.contains('tbp-svg-marker--spare')).toBe(false);
    }
  });

  it('renders the portrait variant with its own label and all 22 inputs', () => {
    render(<TyreTruckDiagram slots={allSlots()} vertical={true} onSerialCommit={vi.fn()} />);

    const svg = screen.getByRole('img');
    expect(svg.getAttribute('aria-label')).toContain('xoay dọc');
    for (let n = 1; n <= 22; n++) {
      expect(screen.getByLabelText(`Số seri ô ${n}`)).toBeTruthy();
    }
  });

  it('renders a marker with an empty serial input for a position missing from slots', () => {
    render(<TyreTruckDiagram slots={[slot(1, 'TL-001')]} vertical={false} onSerialCommit={vi.fn()} />);

    expect((screen.getByLabelText('Số seri ô 1') as HTMLInputElement).value).toBe('TL-001');
    expect((screen.getByLabelText('Số seri ô 22') as HTMLInputElement).value).toBe('');
  });
});
