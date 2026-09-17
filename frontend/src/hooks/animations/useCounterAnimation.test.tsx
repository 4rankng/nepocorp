import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCounterAnimation } from './useCounterAnimation';
const mocks = vi.hoisted(() => ({ reduced: false, animate: vi.fn(), pause: vi.fn() }));
vi.mock('animejs', () => ({ animate: mocks.animate }));
vi.mock('../usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => mocks.reduced }));
beforeEach(() => { mocks.reduced = false; vi.clearAllMocks(); mocks.animate.mockReturnValue({ pause: mocks.pause }); });
describe('counter motion preferences', () => {
  it('renders final localized values and custom currency format without animation', () => {
    mocks.reduced = true;
    const { result } = renderHook(() => useCounterAnimation());
    const count = document.createElement('span');
    const money = document.createElement('span');
    act(() => result.current.animateCounters([
      { el: count, value: 1200, suffix: ' chuyến' },
      { el: money, value: -1234, format: n => `${n.toLocaleString('vi-VN')} ₫` },
    ]));
    expect(count.textContent).toBe('1.200 chuyến');
    expect(money.textContent).toBe('-1.234 ₫');
    expect(mocks.animate).not.toHaveBeenCalled();
  });
  it('cancels active animation and restores the final value when reduced motion is enabled', () => {
    const { result, rerender } = renderHook(() => useCounterAnimation());
    const el = document.createElement('span');
    act(() => result.current.animateCounters([{ el, value: 900, prefix: '+' }]));
    expect(mocks.animate).toHaveBeenCalledOnce();
    el.textContent = '45';
    mocks.reduced = true;
    rerender();
    expect(mocks.pause).toHaveBeenCalledOnce();
    expect(el.textContent).toBe('+900');
  });
});
