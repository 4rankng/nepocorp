import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyIosStandaloneViewport,
  installIosStandaloneViewportFix,
  isIosStandalone,
} from './ios-viewport';

/**
 * jsdom ships a bare matchMedia, no visualViewport and a zeroed screen —
 * every test pins exactly the metrics WebKit would report in the scenario
 * under test, then restores whatever the descriptors were.
 */
function stubWindow(opts: {
  mqStandalone?: boolean;
  navigatorStandalone?: boolean;
  visualViewportHeight?: number;
  screenWidth?: number;
  screenHeight?: number;
  innerWidth?: number;
  innerHeight?: number;
}): () => void {
  const restores: Array<() => void> = [];

  const define = (target: object, key: string, value: unknown) => {
    const prev = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, {
      configurable: true,
      writable: true,
      value,
    });
    restores.push(() => {
      if (prev) Object.defineProperty(target, key, prev);
      else delete (target as { [k: string]: unknown })[key];
    });
  };

  define(window, 'matchMedia', (query: string) => ({
    matches: query === '(display-mode: standalone)' && !!opts.mqStandalone,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: () => false,
  }));

  if (opts.navigatorStandalone !== undefined) {
    define(window.navigator, 'standalone', opts.navigatorStandalone);
  }
  if (opts.visualViewportHeight !== undefined) {
    define(window, 'visualViewport', {
      height: opts.visualViewportHeight,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  }
  if (opts.screenWidth !== undefined || opts.screenHeight !== undefined) {
    define(window, 'screen', {
      width: opts.screenWidth ?? 0,
      height: opts.screenHeight ?? 0,
    });
  }
  if (opts.innerWidth !== undefined) define(window, 'innerWidth', opts.innerWidth);
  if (opts.innerHeight !== undefined) define(window, 'innerHeight', opts.innerHeight);

  return () => restores.forEach((restore) => restore());
}

function resetHtml() {
  document.documentElement.classList.remove('ios-standalone');
  document.documentElement.style.removeProperty('--app-height');
}

describe('ios-viewport', () => {
  afterEach(() => {
    resetHtml();
    vi.restoreAllMocks();
  });

  it('plain browser tab: no standalone flag, no --app-height', () => {
    stubWindow({ mqStandalone: false });
    expect(isIosStandalone()).toBe(false);

    applyIosStandaloneViewport();

    expect(document.documentElement.classList.contains('ios-standalone')).toBe(false);
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('');
  });

  it('iOS standalone (navigator.standalone): flags html and takes the LARGEST measurement — a stuck-short visualViewport must not shrink the shell', () => {
    // The WebKit bug scenario: innerHeight 812, visualViewport stuck at 750
    // (short of the screen), full screen 844 (portrait-fixed iOS values).
    stubWindow({
      navigatorStandalone: true,
      visualViewportHeight: 750,
      screenWidth: 390,
      screenHeight: 844,
      innerWidth: 390,
      innerHeight: 812,
    });
    expect(isIosStandalone()).toBe(true);

    applyIosStandaloneViewport();

    expect(document.documentElement.classList.contains('ios-standalone')).toBe(true);
    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('844px');
  });

  it('display-mode: standalone media query also flags standalone', () => {
    stubWindow({ mqStandalone: true });

    applyIosStandaloneViewport();

    expect(document.documentElement.classList.contains('ios-standalone')).toBe(true);
  });

  it('landscape: orientation-aware screen edge (iOS screen dims are portrait-fixed)', () => {
    stubWindow({
      navigatorStandalone: true,
      visualViewportHeight: 380,
      screenWidth: 390,
      screenHeight: 844,
      innerWidth: 844,
      innerHeight: 390,
    });

    applyIosStandaloneViewport();

    expect(document.documentElement.style.getPropertyValue('--app-height')).toBe('390px');
  });

  it('install re-measures on resize and pageshow', () => {
    const restore = stubWindow({
      navigatorStandalone: true,
      visualViewportHeight: 750,
      screenWidth: 390,
      screenHeight: 844,
      innerWidth: 390,
      innerHeight: 812,
    });
    const root = document.documentElement;

    installIosStandaloneViewportFix();
    expect(root.style.getPropertyValue('--app-height')).toBe('844px');

    // A stuck viewport re-measure (resize/pageshow after resume) can update
    // inputs but the shell height may only grow, never shrink.
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 700 });
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('pageshow'));
    expect(root.style.getPropertyValue('--app-height')).toBe('844px');

    restore();
  });
});
