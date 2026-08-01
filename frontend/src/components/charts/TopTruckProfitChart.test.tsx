import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopTruckProfitChart } from './TopTruckProfitChart';

describe('TopTruckProfitChart', () => {
  it('keeps full plate labels, bars, and VND values in separate layout cells', () => {
    render(
      <TopTruckProfitChart
        ariaLabel="Top xe theo lợi nhuận tháng 6/2026"
        items={[
          { name: '15H-168.73', profit: 63_681_641 },
          { name: 'Xe ngoài', profit: 1_265_186 },
        ]}
      />,
    );

    const chart = screen.getByRole('list', { name: 'Top xe theo lợi nhuận tháng 6/2026' });
    const longPlate = screen.getByText('15H-168.73');
    const fullValue = screen.getByText('63.681.641₫');

    expect(chart.contains(longPlate)).toBe(true);
    expect(longPlate.classList.contains('finance-top-trucks__plate')).toBe(true);
    expect(fullValue.classList.contains('finance-top-trucks__value')).toBe(true);
    expect(longPlate.parentElement?.querySelector('.finance-top-trucks__track')).not.toBeNull();
  });

  it('renders negative profit from the shared zero axis without hiding its sign', () => {
    const { container } = render(
      <TopTruckProfitChart
        ariaLabel="Top xe theo lợi nhuận"
        items={[
          { name: '15C-136.31', profit: 12_000_000 },
          { name: '15C-180.99', profit: -3_000_000 },
        ]}
      />,
    );

    expect(
      screen.getByText('-3.000.000₫').classList.contains('finance-top-trucks__value--negative'),
    ).toBe(true);
    expect(container.querySelector('.finance-top-trucks__bar--negative')).not.toBeNull();
    expect(container.querySelectorAll('.finance-top-trucks__zero')).toHaveLength(2);
  });

  it('anchors tiny losses left of zero and does not draw a bar for zero profit', () => {
    const { container } = render(
      <TopTruckProfitChart
        ariaLabel="Top xe theo lợi nhuận"
        items={[
          { name: '15H-168.73', profit: 100_000_000 },
          { name: '15C-139.82', profit: -1 },
          { name: 'Xe ngoài', profit: 0 },
        ]}
      />,
    );

    const negativeBar = container.querySelector<HTMLElement>('.finance-top-trucks__bar--negative');
    const zeroRow = screen.getByText('Xe ngoài').parentElement;

    expect(negativeBar?.style.right).not.toBe('');
    expect(negativeBar?.style.left).toBe('');
    expect(zeroRow?.querySelector('.finance-top-trucks__bar')).toBeNull();
  });
});
