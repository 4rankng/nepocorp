import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintPreviewDialog } from './PrintPreviewDialog';

const html = '<html><body><h1>Phiếu thanh toán</h1><p>1.000.000 đ</p></body></html>';
const observers: Array<() => void> = [];
let viewportWidth = 360;

beforeEach(() => {
  observers.length = 0;
  viewportWidth = 360;
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('print-preview-dialog__viewport') ? viewportWidth : 900;
  });
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { observers.push(callback); }
    observe() {}
    disconnect() {}
  });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

async function loadFrame() {
  const frame = await screen.findByTitle('Phiếu PT-01') as HTMLIFrameElement;
  fireEvent.load(frame);
  return frame;
}

describe('PrintPreviewDialog', () => {
  it('fits the original document, zooms without changing print content, and follows resizing', async () => {
    render(<PrintPreviewDialog title="Phiếu PT-01" loadHtml={async () => html} onClose={vi.fn()} />);
    const frame = await loadFrame();
    const fit = screen.getByRole('button', { name: 'Vừa chiều rộng' });
    const initial = Number(screen.getByLabelText('Mức thu phóng').textContent?.replace('%', ''));
    expect(initial).toBeLessThan(45);
    expect(frame.getAttribute('srcdoc')).toBe(html);
    expect(frame.style.width).toBe('900px');
    expect(frame.getAttribute('sandbox')?.includes('allow-scripts')).toBe(false);
    expect(frame.getAttribute('sandbox')).toContain('allow-modals');
    fireEvent.click(screen.getByRole('button', { name: '100%' }));
    expect(frame.style.transform).toBe('scale(1)');
    const print = vi.spyOn(frame.contentWindow!, 'print').mockImplementation(() => {});
    fireEvent.click(screen.getByRole('button', { name: 'In / Lưu PDF' }));
    expect(print).toHaveBeenCalledOnce();
    expect(frame.getAttribute('srcdoc')).toBe(html);
    fireEvent.click(fit);
    viewportWidth = 720;
    act(() => observers.forEach(callback => callback()));
    expect(Number(screen.getByLabelText('Mức thu phóng').textContent?.replace('%', ''))).toBeGreaterThan(initial);
    expect(fit.getAttribute('aria-pressed')).toBe('true');
    for (let count = 0; count < 10; count++) fireEvent.click(screen.getByRole('button', { name: 'Phóng to' }));
    expect(screen.getByLabelText('Mức thu phóng').textContent).toBe('200%');
    expect((screen.getByRole('button', { name: 'Phóng to' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('offers a retry after a failed load and disables print until the document loads', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(html);
    render(<PrintPreviewDialog title="Phiếu PT-01" loadHtml={load} onClose={vi.fn()} />);
    expect((screen.getByRole('button', { name: 'In / Lưu PDF' }) as HTMLButtonElement).disabled).toBe(true);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await loadFrame();
    expect(load).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByRole('button', { name: 'In / Lưu PDF' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('ignores a superseded request when the source changes', async () => {
    let resolveOld!: (value: string) => void;
    const loadOld = () => new Promise<string>(resolve => { resolveOld = resolve; });
    const { rerender } = render(<PrintPreviewDialog title="Phiếu PT-01" loadHtml={loadOld} onClose={vi.fn()} />);
    rerender(<PrintPreviewDialog title="Phiếu PT-01" loadHtml={async () => html} onClose={vi.fn()} />);
    const frame = await loadFrame();
    await act(async () => resolveOld('<p>Stale document</p>'));
    expect(frame.getAttribute('srcdoc')).toBe(html);
  });

  it('traps toolbar focus and restores the opener after Escape inside the iframe', async () => {
    const load = async () => html;
    function Example() {
      const [open, setOpen] = useState(false);
      return <><button onClick={() => setOpen(true)}>Xem bản in</button>{open && <PrintPreviewDialog title="Phiếu PT-01" loadHtml={load} onClose={() => setOpen(false)} />}</>;
    }
    render(<Example />);
    const opener = screen.getByRole('button', { name: 'Xem bản in' });
    opener.focus();
    fireEvent.click(opener);
    const frame = await loadFrame();
    const print = screen.getByRole('button', { name: 'In / Lưu PDF' });
    const viewport = screen.getByRole('region', { name: 'Nội dung bản xem trước' });
    print.focus();
    fireEvent.keyDown(print, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(viewport);
    fireEvent.keyDown(viewport, { key: 'Tab' });
    expect(document.activeElement).toBe(print);
    frame.focus();
    fireEvent.keyDown(frame.contentDocument!, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).not.toBe('hidden');
  });
});
