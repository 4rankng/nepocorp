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

    // The print dialog must describe the SHEET, so the document is written
    // first and printed only once it has laid out. Calling print() on the
    // still-empty about:blank frame opens a blank dialog (or, when the frame
    // has not committed yet, none at all) — kanban 091026135110.
    let printed = false;

    const print = () => {
      if (printed) return;
      printed = true;
      try {
        const win = iframe?.contentWindow;
        if (!win || typeof win.print !== 'function') throw new Error('no print');
        win.focus();
        win.print();
      } catch {
        // A refusal leaves the user with nothing, so end in the documented
        // fallback (a plain preview tab) rather than a silent no-op.
        printed = false;
        iframe?.remove();
        onFallback?.();
      }
    };

    // `onload` covers engines that fire it for a written-into about:blank
    // frame; the timer covers the ones that never do.
    iframe.onload = print;
    doc.open();
    doc.write(html);
    doc.close();
    // No need to cancel: `print` is idempotent, so a late timer after the
    // load event is a harmless no-op.
    setTimeout(print, 800);

    // Keep the node alive until the dialog closes, then clean up.
    setTimeout(() => { if (printed) iframe?.remove(); }, 60_000);
    return true;
  } catch {
    iframe?.remove();
    onFallback?.();
    return false;
  }
}