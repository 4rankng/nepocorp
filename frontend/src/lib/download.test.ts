import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob, openBlobInNewTab, printHtml } from './download';

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

  it('falls back when the frame cannot print', () => {
    vi.useFakeTimers();
    const onFallback = vi.fn();
    printHtml('<p>x</p>', onFallback);

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    const win = iframe.contentWindow;
    if (!win) throw new Error('iframe has no contentWindow');
    win.print = () => { throw new Error('blocked'); };
    iframe.dispatchEvent(new Event('load'));
    expect(onFallback).toHaveBeenCalledTimes(1);
  });
});