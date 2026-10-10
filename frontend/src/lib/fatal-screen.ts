/**
 * Document-level last resort against a blank page.
 *
 * React error boundaries cover only what React renders. An error in the shell
 * outside a boundary, a fatal error during the first mount, or an uncaught error
 * that unmounts the root leaves `#root` empty — the reported "trang trắng hoàn
 * toàn, không còn element tương tác nào" that recovers after a reload
 * (kanban 101026211510). This handler paints a minimal, readable panel into an
 * EMPTY root when the window reports an uncaught error or a rejected promise, so
 * a fatal failure is always one visible click away from a reload.
 *
 * It never touches a root that still has content — an ordinary background error
 * must not replace a working app.
 */

export const FATAL_SCREEN_ID = 'fatal-screen';

/** True when the app root has nothing painted in it. */
export function isRootBlank(root: HTMLElement | null): boolean {
  if (!root) return true;
  return root.childElementCount === 0;
}

/**
 * Paint the fallback into an empty root. Inline styles only: this runs when the
 * app may have failed before its stylesheet contract is trustworthy.
 */
export function renderFatalScreen(root: HTMLElement, message: string): void {
  if (root.querySelector(`#${FATAL_SCREEN_ID}`)) return;

  const panel = document.createElement('div');
  panel.id = FATAL_SCREEN_ID;
  panel.setAttribute('role', 'alert');
  panel.style.cssText = [
    'min-height:100vh',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'gap:12px',
    'padding:48px 24px',
    'text-align:center',
    'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
    'color:#2E3B34',
  ].join(';');

  const title = document.createElement('h3');
  title.textContent = 'Đã xảy ra lỗi';
  title.style.cssText = 'margin:0;font-size:20px;font-weight:600';

  const detail = document.createElement('p');
  detail.textContent = message || 'Không thể hiển thị nội dung này.';
  detail.style.cssText = 'margin:0;max-width:560px;font-size:14px;line-height:1.5;color:#4A5750';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Tải lại trang';
  retry.style.cssText = 'padding:8px 16px;border-radius:8px;border:1px solid #CBD3CE;background:#FFFFFF;cursor:pointer;font-size:14px;font-weight:500';
  retry.addEventListener('click', () => window.location.reload());

  panel.append(title, detail, retry);
  root.replaceChildren(panel);
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

/**
 * Install the handlers. Returns a disposer (used by tests).
 *
 * No capture phase: that would also deliver resource-loading failures (a broken
 * <img>, a blocked script) which are not fatal to the React tree.
 */
export function installFatalScreen(doc: Document = document): () => void {
  const onError = (event: ErrorEvent) => {
    // Resource failures (a broken <img>, a blocked script) are dispatched at the
    // ELEMENT, not at the window, and cannot have emptied the root. Identity
    // comparison against `window` is unusable here — under jsdom the dispatched
    // target is the underlying window object while the module's `window` is the
    // test global, so `target === window` is false even for a window-level error.
    const target = event.target as unknown as Node | null;
    if (target && target.nodeType === 1) return;
    const root = doc.getElementById('root');
    if (!isRootBlank(root)) return;
    if (root) renderFatalScreen(root, messageOf(event.error) || event.message);
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    const root = doc.getElementById('root');
    if (!isRootBlank(root)) return;
    if (root) renderFatalScreen(root, messageOf(event.reason));
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}
