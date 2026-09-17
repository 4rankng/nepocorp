import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBottomNavAnimations } from './useBottomNavAnimations';

const mocks = vi.hoisted(() => ({ reduced: false, animate: vi.fn(), set: vi.fn() }));
vi.mock('./usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => mocks.reduced }));
vi.mock('animejs', () => ({
  animate: mocks.animate,
  utils: { set: mocks.set },
  cubicBezier: () => 'curve',
  stagger: () => 60,
  createScope: ({ root }: { root: HTMLElement }) => {
    const scope = {
      add(callback: unknown) {
        if (typeof callback === 'function') callback(scope);
        return scope;
      },
      // Anime scope revert removes inline animation state; it does not invoke
      // named methods registered through add('cleanup', callback).
      revert: () => root.querySelectorAll<HTMLElement>('.bottom-nav-item').forEach(item => { item.style.opacity = ''; }),
    };
    return scope;
  },
}));

function Nav({ ready = true }: { ready?: boolean }) {
  const ref = useBottomNavAnimations({ ready });
  return <nav ref={ref}>
    <button className="bottom-nav-item active"><span className="bottom-nav-indicator" />Chuyến đi</button>
    <button className="bottom-nav-item">Tài khoản</button>
  </nav>;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.reduced = false;
  const applyOpacity = (targets: HTMLElement | NodeListOf<HTMLElement>, options: { opacity?: number | number[] }) => {
    if (options.opacity === undefined) return;
    const opacity = Array.isArray(options.opacity) ? options.opacity.at(-1)! : options.opacity;
    const elements = targets instanceof HTMLElement ? [targets] : Array.from(targets);
    elements.forEach(element => { element.style.opacity = String(opacity); });
  };
  mocks.animate.mockImplementation(applyOpacity);
  mocks.set.mockImplementation(applyOpacity);
});
afterEach(() => vi.useRealTimers());

describe('driver bottom navigation motion lifecycle', () => {
  it('restores visible reduced-motion items after StrictMode replays the effect', () => {
    mocks.reduced = true;
    const view = render(<StrictMode><Nav /></StrictMode>);
    screen.getAllByRole('button').forEach(button => expect(button.style.opacity).toBe('1'));
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('updates normal → reduced → normal motion without stale or duplicate press listeners', () => {
    const view = render(<StrictMode><Nav /></StrictMode>);
    const button = screen.getByRole('button', { name: 'Chuyến đi' });
    mocks.animate.mockClear();
    fireEvent.pointerDown(button);
    expect(mocks.animate).toHaveBeenCalledOnce();

    mocks.reduced = true;
    view.rerender(<StrictMode><Nav /></StrictMode>);
    expect(button.style.opacity).toBe('1');
    mocks.animate.mockClear();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    expect(mocks.animate).not.toHaveBeenCalled();

    mocks.reduced = false;
    view.rerender(<StrictMode><Nav /></StrictMode>);
    expect(button.style.opacity).toBe('1');
    mocks.animate.mockClear();
    fireEvent.pointerDown(button);
    expect(mocks.animate).toHaveBeenCalledOnce();
    view.unmount();
    mocks.animate.mockClear();
    fireEvent.pointerDown(button);
    fireEvent.pointerUp(button);
    fireEvent.pointerLeave(button);
    fireEvent.pointerCancel(button);
    expect(mocks.animate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('attaches feedback when driver navigation becomes ready and cleans it up when disabled', () => {
    const view = render(<Nav ready={false} />);
    const button = screen.getByRole('button', { name: 'Chuyến đi' });
    fireEvent.pointerDown(button);
    expect(mocks.animate).not.toHaveBeenCalled();
    view.rerender(<Nav ready />);
    mocks.animate.mockClear();
    fireEvent.pointerDown(button);
    expect(mocks.animate).toHaveBeenCalledOnce();
    view.rerender(<Nav ready={false} />);
    mocks.animate.mockClear();
    fireEvent.pointerDown(button);
    expect(mocks.animate).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
