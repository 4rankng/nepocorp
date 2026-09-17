import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TripSummaryCard } from './TripSummaryCard';

const useTripFormContextMock = vi.fn();

vi.mock('../../hooks/useTripFormContext', () => ({
  useTripFormContext: () => useTripFormContextMock(),
}));

describe('TripSummaryCard profit estimate', () => {
  it.each([
    { profit: -1250000, sign: '−', amount: '1.250.000', tone: 'neg' },
    { profit: 0, sign: null, amount: '0', tone: null },
    { profit: 1250000, sign: '+', amount: '1.250.000', tone: 'pos' },
  ])('shows the correct sign and tone for $profit VND', ({ profit, sign, amount, tone }) => {
    useTripFormContextMock.mockReturnValue({
      revenue: '4000000',
      estimatedFuelCost: 2000000,
      estimatedTollCost: 250000,
      driverSalary: '500000',
      estimatedProfit: profit,
      tollsStations: '2',
    });

    render(<TripSummaryCard />);

    const label = screen.getByText('Lợi nhuận dự kiến');
    const row = label.closest('.tc-summary-row--total')!;
    const value = row.querySelector('.tc-summary-row__val')!;
    expect(within(value as HTMLElement).getByText(amount)).toBeTruthy();
    expect(value.querySelector('.money__sign')?.textContent ?? null).toBe(sign);
    expect(value.classList.contains('tc-summary-row__val--neg')).toBe(tone === 'neg');
    expect(value.classList.contains('tc-summary-row__val--pos')).toBe(tone === 'pos');
    expect(label.style.color).toBe('');
  });
});
