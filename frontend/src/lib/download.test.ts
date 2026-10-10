import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob, openBlobInNewTab, printHtml, printSheet, withAutoPrint, PRINT_OUTCOME_TOAST } from './download';

/**
 * The regression these lock down: every export used to revoke the object URL
 * synchronously right after `a.click()`, with a detached anchor. Both patterns
 * break downloads on Safari / iOS PWA, which is how "em không tải được"
 * reached support.
 */
describe('downloadBlob', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('attaches the anchor to the document while clicking (Safari requirement)', () => {
    const clicks: HTMLAnchorElement[] = [];
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function click(this: HTMLAnchorElement) {
      clicks.push(this);
      // The anchor must still be in the DOM at click time.
      expect(document.body.contains(this)).toBe(true);
    };

    try {
      downloadBlob(new Blob(['x']), 'bang-ke.xlsx');
      expect(clicks).toHaveLength(1);
      expect(clicks[0].download).toBe('bang-ke.xlsx');
      expect(clicks[0].getAttribute('href')).toBe('blob:mock-url');
      expect(clicks[0].rel).toBe('noopener');
    } finally {
      HTMLAnchorElement.prototype.click = origClick;
    }
  });

  it('does NOT revoke synchronously — the transfer must still be able to read the blob', () => {
    downloadBlob(new Blob(['x']), 'a.xlsx');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    // ...but it does clean up eventually.
    vi.advanceTimersByTime(10_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('removes the anchor from the DOM after clicking', () => {
    downloadBlob(new Blob(['x']), 'a.xlsx');
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });
});

describe('openBlobInNewTab', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:print-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('never revokes — the preview tab keeps reading the URL', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    openBlobInNewTab(new Blob(['x']));
    expect(open).toHaveBeenCalledWith('blob:print-url', '_blank', 'noopener');
    vi.advanceTimersByTime(60_000);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});

/**
 * The "PDF (In)" no-op (kanban 091026135110) came from printing the iframe
 * BEFORE the sheet was written into it. These lock the order in: the document
 * must be present when print() runs, and print must fire exactly once.
 */
describe('printHtml', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('iframe').forEach(f => f.remove());
  });

  it('writes the sheet before printing, exactly once', () => {
    vi.useFakeTimers();
    const onFallback = vi.fn();
    const ok = printHtml('<h1>Bảng kê</h1>', onFallback);
    expect(ok).toBe(true);

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    expect(iframe).toBeTruthy();
    // The sheet is already in the frame when print() is reachable.
    expect(iframe.contentDocument?.body?.innerHTML ?? '').toContain('Bảng kê');

    const win = iframe.contentWindow;
    if (!win) throw new Error('iframe has no contentWindow');
    const print = vi.fn();
    win.print = print;

    iframe.dispatchEvent(new Event('load'));
    vi.advanceTimersByTime(1000); // late timer must be a no-op after load
    expect(print).toHaveBeenCalledTimes(1);
    expect(onFallback).not.toHaveBeenCalled();
  });

  it('reports a refusal that only surfaces when the sheet has loaded', () => {
    vi.useFakeTimers();
    const onRefused = vi.fn();
    expect(printHtml('<p>x</p>', onRefused)).toBe(true);

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    const win = iframe.contentWindow;
    if (!win) throw new Error('iframe has no contentWindow');
    win.print = () => { throw new Error('blocked'); };
    iframe.dispatchEvent(new Event('load'));
    expect(onRefused).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });
});

/**
 * The freeze these lock down: window.print() is modal, so the tab that calls it
 * runs no script until the dialog closes. Printing from the app's own tab left
 * /expenses disabled at "Đang chuẩn bị…" with no dialog and no download, and the
 * supplier statement's menu closed onto nothing (kanban 101026102000 /
 * 101026102010). The sheet therefore has to print from a tab of its own, and
 * only a blocked popup may fall back to the in-page dialog.
 */
describe('withAutoPrint', () => {
  it('opens the dialog from the sheet tab without a second click', () => {
    const html = withAutoPrint('<!DOCTYPE html><body><h1>Bảng kê</h1></body></html>');
    expect(html).toContain('<h1>Bảng kê</h1>');
    expect(html.indexOf('window.print()')).toBeLessThan(html.indexOf('</body>'));
  });

  it('appends the trigger when the sheet has no body element', () => {
    const html = withAutoPrint('<h1>Bảng kê</h1>');
    expect(html).toBe('<h1>Bảng kê</h1><script>window.addEventListener("load",function(){setTimeout(function(){window.print();},150);});</script>');
  });
});

describe('printSheet', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:sheet-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelectorAll('iframe').forEach(f => f.remove());
  });

  it('prints from its own tab and leaves the app tab alone', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as unknown as Window);

    expect(printSheet('<html><body>x</body></html>')).toBe('tab');
    expect(open).toHaveBeenCalledWith('blob:sheet-url', '_blank');
    // A tab of its own is the whole point: no iframe, so nothing prints in the
    // app's renderer and the page keeps running.
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('falls back to the in-page dialog when the tab is blocked, and reports it', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);

    const outcome = printSheet('<html><body>x</body></html>');

    expect(outcome).toBe('inline');
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    // The unused URL must not leak.
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sheet-url');
  });

  it('reports a blocked export when neither path can print', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    // No DOM iframe support at all.
    vi.spyOn(document, 'createElement').mockImplementation(() => { throw new Error('no iframe'); });

    expect(printSheet('<html><body>x</body></html>')).toBe('blocked');
    expect(PRINT_OUTCOME_TOAST.blocked.kind).toBe('error');
  });

  it('reports a print the browser refuses after the sheet loaded', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const onRefused = vi.fn();

    expect(printSheet('<html><body>x</body></html>', onRefused)).toBe('inline');
    const win = (document.querySelector('iframe') as HTMLIFrameElement).contentWindow;
    if (!win) throw new Error('iframe has no contentWindow');
    win.print = () => { throw new Error('blocked'); };
    (document.querySelector('iframe') as HTMLIFrameElement).dispatchEvent(new Event('load'));

    expect(onRefused).toHaveBeenCalledTimes(1);
  });

  it('uses a toast per outcome so a failure is never silent', () => {
    expect(PRINT_OUTCOME_TOAST.tab.message).toMatch(/Lưu thành PDF/);
    expect(PRINT_OUTCOME_TOAST.inline.message).toMatch(/Lưu thành PDF/);
    expect(PRINT_OUTCOME_TOAST.blocked.message).toMatch(/Cmd\/Ctrl \+ P/);
  });
});