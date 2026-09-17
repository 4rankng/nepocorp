import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContainerScanner } from './ContainerScanner';

afterEach(() => vi.unstubAllGlobals());

describe('ContainerScanner', () => {
  it('releases a camera granted after the scanner has already closed', async () => {
    let resolveCamera!: (stream: MediaStream) => void;
    const getUserMedia = vi.fn(() => new Promise<MediaStream>((resolve) => { resolveCamera = resolve; }));
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    const { unmount } = render(<ContainerScanner onCapture={() => {}} onClose={() => {}} />);
    expect(getUserMedia).toHaveBeenCalledOnce();
    unmount();

    await act(async () => { resolveCamera(stream); });

    expect(stop).toHaveBeenCalledOnce();
    expect(document.body.style.overflow).toBe('');
  });

  it('keeps the gallery available without camera access and handles Escape', () => {
    vi.stubGlobal('navigator', {});
    const close = vi.fn();
    render(<ContainerScanner onCapture={() => {}} onClose={close} />);
    expect(screen.getByRole('dialog', { name: 'Chụp ảnh container' })).toBeTruthy();
    const gallery = screen.getByRole('button', { name: 'Chọn ảnh từ thư viện' });
    expect(gallery.hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Chụp ảnh' }).hasAttribute('disabled')).toBe(true);
    fireEvent.keyDown(gallery, { key: 'Escape' });
    expect(close).toHaveBeenCalledOnce();
  });
});
