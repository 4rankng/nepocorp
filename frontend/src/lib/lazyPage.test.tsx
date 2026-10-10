import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Suspense, type ComponentType } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { PENDING_RELOAD, handleLazyFailure, lazyPage } from './lazyPage';
import * as chunkError from './chunk-error';

const CHUNK_MESSAGE = 'Failed to fetch dynamically imported module: /src/pages/DashboardPage.tsx';

describe('handleLazyFailure', () => {
  beforeEach(() => {
    vi.spyOn(chunkError, 'recoverFromChunkFailure').mockReturnValue(true);
  });

  afterEach(() => vi.restoreAllMocks());

  it('hands a chunk failure to the shared recovery and keeps Suspense pending', async () => {
    const result = handleLazyFailure(new Error(CHUNK_MESSAGE));
    expect(chunkError.recoverFromChunkFailure).toHaveBeenCalledTimes(1);
    expect(result).toBe(PENDING_RELOAD);

    // The tab is about to reload: the promise must never settle, or React would
    // render the broken route instead of holding the loading fallback.
    let settled = false;
    void result.then(() => { settled = true; }, () => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it('rethrows once the once-per-session recovery is spent', () => {
    vi.mocked(chunkError.recoverFromChunkFailure).mockReturnValue(false);
    expect(() => handleLazyFailure(new Error(CHUNK_MESSAGE))).toThrow(CHUNK_MESSAGE);
  });

  it('leaves ordinary render errors to the ErrorBoundary untouched', () => {
    expect(() => handleLazyFailure(new Error('Cannot read properties of undefined'))).toThrow(
      'Cannot read properties of undefined',
    );
    expect(chunkError.recoverFromChunkFailure).not.toHaveBeenCalled();
  });
});

describe('lazyPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders the page once its module loads', async () => {
    const Page: ComponentType = () => <p>nội dung trang</p>;
    const LazyPage = lazyPage(() => Promise.resolve({ default: Page }));

    render(
      <Suspense fallback={<p>Đang tải…</p>}>
        <LazyPage />
      </Suspense>,
    );

    expect(await screen.findByText('nội dung trang')).toBeTruthy();
  });

  it('holds the loading fallback through a recoverable chunk failure instead of caching it', async () => {
    const recover = vi.spyOn(chunkError, 'recoverFromChunkFailure').mockReturnValue(true);
    const LazyPage = lazyPage(
      (): Promise<{ default: ComponentType }> => Promise.reject(new Error(CHUNK_MESSAGE)),
    );

    render(
      <Suspense fallback={<p>Đang tải…</p>}>
        <LazyPage />
      </Suspense>,
    );

    await waitFor(() => expect(recover).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Đang tải…')).toBeTruthy();
  });
});
