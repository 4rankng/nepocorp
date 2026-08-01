import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RevenueTrendChart } from './RevenueTrendChart';

let resizeCallback: ResizeObserverCallback;

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      resizeCallback = callback;
    }
    observe() {}
    disconnect() {}
  });
});

describe('RevenueTrendChart money formatting', () => {
  it('shows full VND digits on the axis, accessible description, and tooltip', () => {
    const { container } = render(
      <RevenueTrendChart
        months={['1', '2']}
        revenue={[520.1000004, 1_000]}
        gross={[157.7, 250]}
      />,
    );

    expect(screen.getByText('1.000.000.000 ₫')).not.toBeNull();
    expect(container.querySelector('desc')?.textContent).toContain('doanh thu 1.000.000.000 ₫');
    expect(container.textContent).not.toContain('tr₫');
    expect(container.textContent).not.toMatch(/\d(?:,\d)? Tr\b/);

    const hitAreas = container.querySelectorAll('rect[style*="crosshair"]');
    fireEvent.mouseEnter(hitAreas[0]);

    expect(screen.getByText('520.100.000 ₫')).not.toBeNull();
    expect(screen.getByText('157.700.000 ₫')).not.toBeNull();
  });

  it('keeps the full-number tooltip inside a narrow chart and exposes points to keyboards', () => {
    render(
      <RevenueTrendChart
        months={['1', '2']}
        revenue={[123.45678912, 520.1]}
        gross={[45.6, 157.7]}
      />,
    );

    act(() => {
      resizeCallback(
        [{ contentRect: { width: 320, height: 280 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });

    const firstPoint = screen.getByRole('button', {
      name: '1: doanh thu 123.456.789 ₫, lợi nhuận gộp 45.600.000 ₫',
    });
    fireEvent.focus(firstPoint);

    const tooltip = screen.getByTestId('revenue-trend-tooltip');
    expect(tooltip.textContent).toContain('123.456.789 ₫');
    expect(tooltip.style.width).toBe('250px');
    expect(Number.parseFloat(tooltip.style.left)).toBeGreaterThanOrEqual(133);
    expect(Number.parseFloat(tooltip.style.left)).toBeLessThanOrEqual(187);
  });
});
