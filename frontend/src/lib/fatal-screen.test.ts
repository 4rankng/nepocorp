import { afterEach, describe, expect, it } from 'vitest';
import { FATAL_SCREEN_ID, installFatalScreen, isRootBlank, renderFatalScreen } from './fatal-screen';

/**
 * The document-level guarantee behind card F (kanban 101026211510): a fatal
 * failure must never leave a page with nothing to click.
 */

let dispose: (() => void) | null = null;

afterEach(() => {
  dispose?.();
  dispose = null;
  document.body.innerHTML = '';
});

function mountRoot(): HTMLElement {
  const root = document.createElement('div');
  root.id = 'root';
  document.body.append(root);
  return root;
}

describe('isRootBlank', () => {
  it('is true for a missing or empty root, false once anything is painted', () => {
    expect(isRootBlank(null)).toBe(true);
    const root = mountRoot();
    expect(isRootBlank(root)).toBe(true);
    root.append(document.createElement('div'));
    expect(isRootBlank(root)).toBe(false);
  });
});

describe('fatal screen', () => {
  it('paints a readable, retryable panel into an empty root', () => {
    const root = mountRoot();
    renderFatalScreen(root, 'boom during mount');

    const panel = root.querySelector(`#${FATAL_SCREEN_ID}`);
    expect(panel).toBeTruthy();
    expect(panel?.textContent).toContain('Đã xảy ra lỗi');
    expect(panel?.textContent).toContain('boom during mount');
    expect(panel?.querySelector('button')?.textContent).toBe('Tải lại trang');
  });

  it('replaces an uncaught window error only while the root is empty', () => {
    const root = mountRoot();
    dispose = installFatalScreen(document);

    window.dispatchEvent(new ErrorEvent('error', { message: 'uncaught boom' }));
    expect(root.querySelector(`#${FATAL_SCREEN_ID}`)).toBeTruthy();
    expect(root.textContent).toContain('uncaught boom');
  });

  it('never touches a root that still has content', () => {
    const root = mountRoot();
    root.append(document.createElement('p'));
    dispose = installFatalScreen(document);

    window.dispatchEvent(new ErrorEvent('error', { message: 'background boom' }));
    expect(root.querySelector(`#${FATAL_SCREEN_ID}`)).toBeNull();
    expect(root.textContent).toBe('');
  });

  it('covers an unhandled promise rejection as well', () => {
    const root = mountRoot();
    dispose = installFatalScreen(document);

    window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason: new Error('rejected boom'),
    }));
    expect(root.querySelector(`#${FATAL_SCREEN_ID}`)?.textContent).toContain('rejected boom');
  });
});
