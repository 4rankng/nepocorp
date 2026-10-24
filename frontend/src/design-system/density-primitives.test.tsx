import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { hasColumnData, useAutoHideColumn } from './AutoHideColumn';
import { SubLine } from './SubLine';
import { DenseKpi } from './DenseKpi';

afterEach(cleanup);

describe('AutoHideColumn (NEPO-16)', () => {
  it('is false when every value is a placeholder', () => {
    expect(hasColumnData([null, null])).toBe(false);
    expect(hasColumnData(['—', '—', '—'])).toBe(false);
    expect(hasColumnData(['', undefined, '   '.trim()])).toBe(false);
    expect(hasColumnData([])).toBe(false);
  });

  it('is true as soon as one row carries data', () => {
    expect(hasColumnData([null, '50.000.000 ₫', null])).toBe(true);
    expect(hasColumnData([0, null])).toBe(true); // 0 is data, not an empty marker
  });

  it('supports the stricter single-distinct-value collapse', () => {
    expect(hasColumnData(['5.000.000', '5.000.000', '5.000.000'])).toBe(true);
    expect(hasColumnData(['5.000.000', '5.000.000'], { minDistinct: 2 })).toBe(false);
    expect(hasColumnData(['5.000.000', '6.000.000'], { minDistinct: 2 })).toBe(true);
  });

  it('useAutoHideColumn mirrors the predicate', () => {
    let visible: boolean | undefined;
    function Probe({ values }: { values: unknown[] }) {
      visible = useAutoHideColumn(values);
      return null;
    }
    render(<Probe values={['—', '—']} />);
    expect(visible).toBe(false);
    render(<Probe values={['—', 12]} />);
    expect(visible).toBe(true);
  });
});

describe('SubLine (NEPO-16)', () => {
  it('renders nothing for empty/placeholder values', () => {
    const { container } = render(
      <>
        <SubLine value={null} />
        <SubLine value="" />
        <SubLine value="   " />
        <SubLine value="—" />
      </>,
    );
    expect(container.querySelector('.ds-sub-line')).toBeNull();
  });

  it('renders the value in the muted line', () => {
    const { container } = render(<SubLine value="0987 654 321" />);
    const line = container.querySelector('.ds-sub-line');
    expect(line?.textContent).toBe('0987 654 321');
  });

  it('renders custom children when provided', () => {
    const { container } = render(<SubLine value="0987"><b>A</b></SubLine>);
    expect(container.querySelector('.ds-sub-line')?.textContent).toBe('A');
  });
});

describe('DenseKpi (NEPO-16)', () => {
  it('renders label, one-line value with unit, and optional meta', () => {
    const { container } = render(
      <DenseKpi label="Tổng chi phí" value="12.500.000" unit="₫" meta="3 phiếu" />,
    );
    expect(container.querySelector('.ds-kpi__label')?.textContent).toBe('Tổng chi phí');
    expect(container.querySelector('.ds-kpi__value')?.textContent).toBe('12.500.000₫');
    expect(container.querySelector('.ds-kpi__meta')?.textContent).toBe('3 phiếu');
  });

  it('omits the unit and meta slots when absent', () => {
    const { container } = render(<DenseKpi label="Số phiếu" value={7} />);
    expect(container.querySelector('.ds-kpi__unit')).toBeNull();
    expect(container.querySelector('.ds-kpi__meta')).toBeNull();
  });
});
