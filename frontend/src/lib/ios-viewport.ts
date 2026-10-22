/**
 * iOS standalone ("Add to Home Screen") viewport compensation.
 *
 * Why: in standalone WKWebView the bottom band of the physical screen can
 * fall outside what CSS geometry can reach — 100dvh resolves ~34px short
 * of the screen (the safe-area inset is not part of dvh there) and
 * visualViewport.height can additionally report below screen.height by a
 * status-bar inset (WebKit bug), so the shell stops above the real bottom
 * edge and the system canvas shows through as a gray strip
 * (consult Gemini+DeepSeek 23/10).
 *
 * What this does — desktop and in-browser mobile stay untouched:
 *  - flags <html> with `ios-standalone` so standalone-only CSS rules apply
 *    (navigator.standalone covers iOS versions where the
 *    (display-mode: standalone) media query does not match);
 *  - publishes `--app-height`, the largest of innerHeight /
 *    visualViewport.height / full-screen height, so a stuck or shrunken
 *    visualViewport (keyboard close, app-switcher resume) can never shrink
 *    the shell back below the gap — CSS only consumes it under
 *    html.ios-standalone (see layout/app-shell.css).
 *
 * Re-measures on load / resize / pageshow / visibilitychange: WebKit can
 * freeze viewport metrics until one of those fires after a resume.
 */

const STANDALONE_MQ = '(display-mode: standalone)';

type StandaloneNavigator = Navigator & { standalone?: boolean };

export function isIosStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia(STANDALONE_MQ).matches) return true;
  // iOS-only signal, available since iOS 2.1 — the reliable fallback on
  // versions where the media query above does not match in standalone.
  return (window.navigator as StandaloneNavigator).standalone === true;
}

/**
 * Full-screen height in CSS points, orientation-aware. iOS reports
 * screen.width/height as PORTRAIT-FIXED (the values never rotate);
 * Android swaps them on rotation — pick the edge that matches the current
 * orientation so landscape resolves to the short edge, portrait to the
 * long edge.
 */
function fullScreenHeight(): number {
  const sw = window.screen?.width ?? 0;
  const sh = window.screen?.height ?? 0;
  if (!sw || !sh) return 0;
  return window.innerWidth > window.innerHeight ? Math.min(sw, sh) : Math.max(sw, sh);
}

export function applyIosStandaloneViewport(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const standalone = isIosStandalone();
  root.classList.toggle('ios-standalone', standalone);
  if (!standalone) {
    // Keep the variable out of browser/desktop mode entirely so nothing but
    // the standalone-scoped rules can ever observe it.
    root.style.removeProperty('--app-height');
    return;
  }
  // Never accept the smallest measurement: a visualViewport stuck short of
  // the screen (the bug itself) must not SHRINK the shell and reopen the
  // gap — the value may only grow to cover it. The keyboard path is safe
  // too: screen.height is keyboard-invariant, so the shell keeps its full
  // height and the keyboard simply overlays it, same as the CSS lvh default.
  const vv = window.visualViewport;
  const height = Math.round(
    Math.max(window.innerHeight || 0, vv?.height || 0, fullScreenHeight()),
  );
  if (height > 0) root.style.setProperty('--app-height', `${height}px`);
}

/**
 * Install once at boot (main.tsx), before the first render, so the flag and
 * the variable exist before the app shell paints.
 */
export function installIosStandaloneViewportFix(): void {
  if (typeof window === 'undefined') return;
  applyIosStandaloneViewport();

  const vv = window.visualViewport;
  window.addEventListener('load', applyIosStandaloneViewport, { once: true });
  window.addEventListener('resize', applyIosStandaloneViewport);
  // bfcache restore and iOS app-switcher resume both surface as pageshow.
  window.addEventListener('pageshow', applyIosStandaloneViewport);
  document.addEventListener('visibilitychange', applyIosStandaloneViewport);
  vv?.addEventListener('resize', applyIosStandaloneViewport);
  // Display-mode flips (desktop-PWA install, devtools emulation).
  window.matchMedia(STANDALONE_MQ).addEventListener('change', applyIosStandaloneViewport);
}
