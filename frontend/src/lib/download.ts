/**
 * Shared blob-download helper.
 *
 * Every export surface used to do this by hand:
 *
 *   const a = document.createElement('a');
 *   a.href = url; a.download = name; a.click();
 *   URL.revokeObjectURL(url);      // ← wrong
 *
 * Revoking synchronously after `click()` can abort the transfer before the
 * browser has read the blob, and a detached anchor is unreliable in Safari /
 * iOS PWA — which is why exports sometimes "didn't download" on the iPhone.
 * `FuelCard.tsx` already had the correct shape (revoke on a timer); this
 * centralises it so the pattern cannot drift again.
 */

/** Keep the blob URL alive well past the browser's fetch of it. */
const REVOKE_DELAY_MS = 10_000;

/**
 * Trigger a file download for `blob` under `filename`.
 *
 * The anchor is attached to the document for the duration of the click —
 * Safari requires it — then removed. The object URL is revoked on a timer,
 * never synchronously, so slow readers still get the full file.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), REVOKE_DELAY_MS);
}

/**
 * Open `blob` in a new tab (print/preview flows).
 *
 * Deliberately does NOT revoke: the new tab keeps reading the URL for as
 * long as the user has it open, and revoking would blank the preview.
 */
export function openBlobInNewTab(blob: Blob): void {
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener');
}

/**
 * Print `html` via a hidden same-origin iframe and open the browser print
 * dialog.
 *
 * The statement's "PDF (In)" button previously did `openBlobInNewTab(html)`
 * and stopped there. Two problems, both reported by staff (kanban
 * 081026232560): the new tab only *previews* the sheet so nothing looks like
 * it "did nothing", and `window.open` is blocked outright on iOS Safari and
 * inside an installed PWA — the click produced no tab and no dialog at all.
 * An iframe needs no user gesture and is never popup-blocked.
 *
 * `onFallback` runs if the iframe cannot be built or loaded (very old
 * browsers, strict CSP); callers use it to fall back to a plain tab.
 */
export function printHtml(html: string, onFallback?: () => void): boolean {
  let iframe: HTMLIFrameElement | null = null;
  try {
    iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = 'about:blank';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) throw new Error('no contentDocument');

    // Declared up front so a retry can cancel the fallback timer it owns.
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    // Dispatch print() and report whether it was actually handed to the engine.
    // Engines that refuse a programmatic print outside a user gesture return
    // silently (no throw), which previously left the caller showing a false
    // "success" toast for a dialog that never opened (kanban 091026135110).
    // We therefore drive the FIRST attempt synchronously inside the click
    // gesture, and only treat a thrown/missing contentWindow as failure.
    let needsRetry = false;
    const attemptPrint = (): boolean => {
      const win = iframe?.contentWindow;
      if (!win || typeof win.print !== 'function') return false;
      try {
        win.focus();
        win.print();
        return true;
      } catch {
        return false;
      }
    };

    const printedNow = attemptPrint();
    if (!printedNow) needsRetry = true;

    // Retry once after the document has loaded — covers engines that refuse
    // print() until the frame is ready, and the (slow) case where the first
    // attempt threw. The timer only fires for engines that never fire load.
    const retry = () => {
      if (!needsRetry) return;
      needsRetry = false;
      clearTimeout(fallbackTimer);
      // A silent refusal still leaves the user with nothing, so end in the
      // documented fallback rather than a no-op.
      if (!attemptPrint()) onFallback?.();
    };
    iframe.onload = retry;

    doc.open();
    doc.write(html);
    doc.close();
    if (needsRetry) fallbackTimer = setTimeout(retry, 1500);

    // Keep the node alive until the dialog closes, then clean up.
    setTimeout(() => iframe?.remove(), 60_000);
    return printedNow;
  } catch {
    iframe?.remove();
    onFallback?.();
    return false;
  }
}