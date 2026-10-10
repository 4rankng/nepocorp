import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdvanceBalanceNote, advanceBalanceFormula, parseAdvanceBalanceFigures } from './AdvanceBalanceNote';

/** The live local numbers: 991.606.600 − 782.274.800 = 209.331.800. */
const liveFigures = {
  totalOutstanding: '209331800',
  approvedTotal: '991606600',
  settledTotal: '782274800',
};

describe('AdvanceBalanceNote (kanban 101026203110)', () => {
  it('spells out the subtraction the reported total comes from', () => {
    render(<AdvanceBalanceNote figures={liveFigures} />);

    expect(screen.getByText(/Tồn tạm ứng \(tất cả các tháng\) = tạm ứng đã duyệt/)).toBeTruthy();
    // Every side of the formula is on screen, formatted vi-VN.
    expect(screen.getByText('991.606.600 ₫')).toBeTruthy();
    expect(screen.getByText('782.274.800 ₫')).toBeTruthy();
    expect(screen.getByText('209.331.800 ₫')).toBeTruthy();
    // The conservative rule that explains a PENDING-only link staying in the total.
    expect(screen.getByText(/Phiếu hoàn ứng chưa duyệt không trừ vào tồn/)).toBeTruthy();
  });

  it('renders nothing when the payload has no components (mocked/stale hook)', () => {
    const { container } = render(<AdvanceBalanceNote figures={{ totalOutstanding: '0' }} />);
    expect(container.textContent).toBe('');
    expect(render(<AdvanceBalanceNote figures={undefined} />).container.textContent).toBe('');
  });

  it('formats the formula as one subtraction string', () => {
    expect(advanceBalanceFormula(liveFigures)).toBe('991.606.600 ₫ − 782.274.800 ₫ = 209.331.800 ₫');
  });

  it('falls back to approved − settled when the payload omits the total', () => {
    expect(parseAdvanceBalanceFigures({ approvedTotal: '1000', settledTotal: '400' }))
      .toEqual({ approved: 1000, settled: 400, total: 600 });
  });

  it('refuses non-numeric components instead of printing NaN', () => {
    expect(parseAdvanceBalanceFigures({ approvedTotal: 'x', settledTotal: '1' })).toBeNull();
    expect(advanceBalanceFormula({ approvedTotal: '1', settledTotal: null })).toBeNull();
  });
});
