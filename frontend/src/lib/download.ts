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
 * This is the FALLBACK path only — see `printSheet`. `window.print()` is
 * modal: while the dialog is up the calling renderer runs no script at all, so
 * printing from the app's own tab freezes the app (kanban 101026102000 /
 * 101026102010). Prefer `printSheet`, which prints from its own tab.
 *
 * Returns false when the frame cannot be built or printed (very old browsers,
 * strict CSP) — `printSheet` turns that into a visible error. `onRefused`
 * covers the same refusal when it only surfaces once the sheet has loaded: the
 * print itself is asynchronous, so a later refusal needs its own report.
 */
export function printHtml(html: string, onRefused?: () => void): boolean {
  let iframe: HTMLIFrameElement | null = null;
  try {
    iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    // Off-screen rather than 0×0: a zero-area frame is skipped by some print
    // pipelines and yields a blank sheet even though the document is loaded.
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
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
        // A refusal leaves the user with nothing, so say so rather than
        // leaving a silent no-op — the sheet is gone either way.
        printed = false;
        iframe?.remove();
        onRefused?.();
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
    return false;
  }
}

/**
 * Make a printable sheet open its own print dialog as soon as it loads.
 *
 * The sheet is handed to a fresh tab, so nothing here can touch the app; the
 * dialog is the whole point of the click, so it opens without a second click
 * (kanban 101026102000 / 101026102010: the account staff saw no outcome at all).
 */
export function withAutoPrint(html: string): string {
  const script = '<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},150);});</script>';
  return html.includes('</body>') ? html.replace('</body>', `${script}</body>`) : html + script;
}

/**
 * Hand `html` to the browser's print pipeline in a tab of its own.
 *
 * Returns false when the tab was blocked (iOS Safari, installed PWA, a popup
 * blocker), which is the caller's cue to print in-page instead.
 *
 * The blob URL is never revoked: the tab — and the print preview it opens —
 * keeps reading it, exactly like `openBlobInNewTab`.
 */
export function openPrintableTab(html: string): boolean {
  const objectUrl = URL.createObjectURL(new Blob([withAutoPrint(html)], { type: 'text/html' }));
  // No `noopener` here on purpose: the sheet is our own same-origin document
  // (there is no link for another origin to hijack), and only a WindowProxy
  // return value tells us whether the popup was blocked.
  const tab = window.open(objectUrl, '_blank');
  if (!tab) {
    URL.revokeObjectURL(objectUrl);
    return false;
  }
  return true;
}

/** How the sheet reached the browser. */
export type PrintOutcome = 'tab' | 'inline' | 'blocked';

/**
 * What to tell the user for each outcome. Kept beside the pipeline so both
 * entry points (/expenses and the supplier statement) say the same thing.
 */
export const PRINT_OUTCOME_TOAST: Record<PrintOutcome, { kind: 'success' | 'info' | 'error'; message: string }> = {
  tab: {
    kind: 'success',
    message: 'Đã mở bản in trong tab mới — chọn "Lưu thành PDF" trong hộp thoại in để xuất file .pdf.',
  },
  inline: {
    kind: 'info',
    message: 'Trình duyệt chặn tab mới nên đã mở hộp thoại in ngay trên trang — chọn "Lưu thành PDF" để xuất file .pdf.',
  },
  blocked: {
    kind: 'error',
    message: 'Không mở được bản in (trình duyệt đang chặn cửa sổ mới). Cho phép popup rồi thử lại, hoặc nhấn Cmd/Ctrl + P trên trang này.',
  },
};

/**
 * Print a prepared sheet from a tab of its own, falling back to the in-page
 * dialog only when the tab is blocked.
 *
 * The print dialog is MODAL: while it is open the renderer that called
 * `window.print()` executes no script, so a print started from the app's own
 * tab left the page frozen with its export buttons still disabled — no
 * download, no dialog the staff could find, nothing but a reload cleared it
 * (kanban 101026102000 on /expenses, 101026102010 on the supplier statement).
 * Printing from a tab of its own keeps the app responsive and makes the
 * outcome visible, and only the popup-blocked fallback can still freeze the
 * app — for exactly as long as the user keeps that dialog open.
 *
 * `onRefused` reports a print the browser refused after the sheet loaded; the
 * return value cannot, because the print runs asynchronously.
 */
export function printSheet(html: string, onRefused?: () => void): PrintOutcome {
  if (openPrintableTab(html)) return 'tab';
  return printHtml(html, onRefused) ? 'inline' : 'blocked';
}