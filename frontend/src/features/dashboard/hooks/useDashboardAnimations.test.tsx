import { act, render, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardAnimations } from './useDashboardAnimations';

const { createDrawable, motion, animateMock, pauseMock } = vi.hoisted(() => ({
  motion: { reduced: false },
  animateMock: vi.fn(),
  pauseMock: vi.fn(),
  createDrawable: vi.fn((path: SVGPathElement) => {
    path.style.strokeDasharray = '0 1010';
    return path;
  }),
}));

vi.mock('animejs', () => ({
  animate: animateMock,
  stagger: vi.fn(() => 0),
  createScope: vi.fn(() => ({
    add(callback: () => void) {
      callback();
      return this;
    },
    revert: vi.fn(),
  })),
  utils: {
    set: vi.fn(),
  },
  svg: {
    createDrawable,
  },
}));

vi.mock('../../../hooks/usePrefersReducedMotion', () => ({
  usePrefersReducedMotion: () => motion.reduced,
}));

beforeEach(() => {
  motion.reduced = false;
  vi.clearAllMocks();
  animateMock.mockReturnValue({ pause: pauseMock });
});

function DashboardAnimationHarness() {
  const { rootRef } = useDashboardAnimations(true);

  return (
    <div ref={rootRef}>
      <div className="wf-kpi" />
      <section className="wf-chart">
        <svg>
          <path data-testid="chart-series" d="M 0 0 L 10 10" stroke="#005A2D" />
        </svg>
      </section>
    </div>
  );
}

describe('useDashboardAnimations', () => {
  it('renders exact financial values immediately when reduced motion is requested', () => {
    motion.reduced = true;
    const { result } = renderHook(() => useDashboardAnimations(true));
    const revenue = document.createElement('span');
    const netProfit = document.createElement('span');
    act(() => result.current.animateCounters([
      { el: revenue, value: 53_191_756 },
      { el: netProfit, value: -2_092_989 },
    ]));
    expect(revenue.textContent).toBe('53.191.756');
    expect(netProfit.textContent).toBe('-2.092.989');
    expect(animateMock).not.toHaveBeenCalled();
  });

  it('settles an active financial counter when reduced motion is enabled', () => {
    const { result, rerender } = renderHook(() => useDashboardAnimations(true));
    const revenue = document.createElement('span');
    act(() => result.current.animateCounters([{ el: revenue, value: 53_191_756 }]));
    revenue.textContent = '43.286.936';
    motion.reduced = true;
    rerender();
    expect(pauseMock).toHaveBeenCalledOnce();
    expect(revenue.textContent).toBe('53.191.756');
  });

  it('keeps chart series visible while dashboard entrance animations run', () => {
    const { getByTestId } = render(<DashboardAnimationHarness />);
    const chartSeries = getByTestId('chart-series');

    expect(createDrawable).not.toHaveBeenCalled();
    expect(chartSeries.style.strokeDasharray).toBe('');
  });
});
