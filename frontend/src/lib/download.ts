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

    // Declared up front so `print` can cancel the fallback timer it owns.
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined = undefined;

    let printed = false;
    const print = () => {
      if (printed) return;
      printed = true;
      clearTimeout(fallbackTimer);
      try {
        iframe!.contentWindow?.focus();
        iframe!.contentWindow?.print();
      } catch {
        /* printing unavailable — the tab below is the fallback */
      }
    };

    // Print once the document has actually loaded, NOT straight after
    // doc.close(): on a slow phone the statement's table can still be
    // laying out, and printing that early yields a blank page — which reads
    // as "the button does nothing". The timer only covers engines that never
    // fire load for a written-into about:blank frame.
    iframe.onload = print;
    doc.open();
    doc.write(html);
    doc.close();
    fallbackTimer = setTimeout(print, 1500);

    // Keep the node alive until the dialog closes, then clean up.
    setTimeout(() => iframe?.remove(), 60_000);
    return true;
  } catch {
    iframe?.remove();
    onFallback?.();
    return false;
  }
}