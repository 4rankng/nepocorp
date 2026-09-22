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

type EngineCallbacks = { onUpdate: () => void; onComplete: () => void };

describe('counter settle guarantees', () => {
  it('writes the exact final formatted value when the animation completes', () => {
    const { result } = renderHook(() => useCounterAnimation());
    const hero = document.createElement('span');
    const money = document.createElement('span');
    act(() => result.current.animateCounters([
      { el: hero, value: 34007186 },
      { el: money, value: -1234, format: n => `${n.toLocaleString('vi-VN')} ₫` },
    ]));
    const [obj, config] = mocks.animate.mock.calls[0] as [{ val: number }, EngineCallbacks];
    const [, moneyConfig] = mocks.animate.mock.calls[1] as [{ val: number }, EngineCallbacks];
    obj.val = 33735922;
    config.onUpdate();
    expect(hero.textContent).toBe('33.735.922');
    moneyConfig.onComplete();
    config.onComplete();
    expect(money.textContent).toBe('-1.234 ₫');
    expect(hero.textContent).toBe('34.007.186');
  });
  it('snaps a cancelled counter to its exact final value when replaced', () => {
    const { result } = renderHook(() => useCounterAnimation());
    const first = document.createElement('span');
    const second = document.createElement('span');
    act(() => result.current.animateCounters([{ el: first, value: 34007186 }]));
    first.textContent = '33.735.922';
    act(() => result.current.animateCounters([{ el: second, value: 500 }]));
    expect(mocks.pause).toHaveBeenCalledOnce();
    expect(first.textContent).toBe('34.007.186');
  });
  it('renders small counters with |value| < 10 immediately without animating', () => {
    const { result } = renderHook(() => useCounterAnimation());
    const two = document.createElement('span');
    const nine = document.createElement('span');
    const zero = document.createElement('span');
    const negative = document.createElement('span');
    act(() => result.current.animateCounters([
      { el: two, value: 2, suffix: ' phiếu' },
      { el: nine, value: 9, suffix: ' chuyến' },
      { el: zero, value: 0 },
      { el: negative, value: -3 },
    ]));
    expect(two.textContent).toBe('2 phiếu');
    expect(nine.textContent).toBe('9 chuyến');
    expect(zero.textContent).toBe('0');
    expect(negative.textContent).toBe('-3');
    expect(mocks.animate).not.toHaveBeenCalled();
  });
  it('animates values of magnitude 10 or more and settles formatted text with suffix', () => {
    const { result } = renderHook(() => useCounterAnimation());
    const ten = document.createElement('span');
    const trips = document.createElement('span');
    act(() => result.current.animateCounters([
      { el: ten, value: 10 },
      { el: trips, value: 1200, suffix: ' chuyến' },
    ]));
    expect(mocks.animate).toHaveBeenCalledTimes(2);
    const [, tenConfig] = mocks.animate.mock.calls[0] as [{ val: number }, EngineCallbacks];
    const [, tripsConfig] = mocks.animate.mock.calls[1] as [{ val: number }, EngineCallbacks];
    tenConfig.onComplete();
    tripsConfig.onComplete();
    expect(ten.textContent).toBe('10');
    expect(trips.textContent).toBe('1.200 chuyến');
  });
});
