import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  installChunkErrorHandler,
  isChunkFailureMessage,
  recoverFromChunkFailure,
} from './chunk-error';

const CHUNK_MESSAGE = 'Failed to fetch dynamically imported module: /assets/AuditLogPage-abc.js';

describe('isChunkFailureMessage', () => {
  it('matches the messages a stale build produces', () => {
    expect(isChunkFailureMessage(CHUNK_MESSAGE)).toBe(true);
    expect(isChunkFailureMessage('Importing a module script failed.')).toBe(true);
    expect(isChunkFailureMessage('Loading chunk 42 failed.')).toBe(true);
    expect(isChunkFailureMessage('ChunkLoadError: Loading CSS chunk 3 failed.')).toBe(true);
  });

  it('ignores unrelated errors and empty messages', () => {
    expect(isChunkFailureMessage('Không thể tải danh sách')).toBe(false);
    expect(isChunkFailureMessage('')).toBe(false);
  });
});

describe('recoverFromChunkFailure', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => vi.restoreAllMocks());

  it('claims the session once, then refuses so a broken deploy cannot loop', () => {
    // The reload itself is jsdom-unobservable (navigation is not implemented);
    // the browser lane proves it end to end. What matters here is the cap.
    expect(recoverFromChunkFailure()).toBe(true);
    expect(recoverFromChunkFailure()).toBe(false);
  });
});

describe('installChunkErrorHandler', () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = '<div id="root"></div>';
    installChunkErrorHandler();
  });

  afterEach(() => vi.restoreAllMocks());

  it('self-heals the first window-surfaced chunk error, then states the problem', async () => {
    window.dispatchEvent(new ErrorEvent('error', { message: CHUNK_MESSAGE }));
    await waitFor(() =>
      expect(document.getElementById('root')?.textContent ?? '').not.toContain('Phiên bản mới'),
    );

    // Second failure in the same session: the once-per-session reload is spent,
    // so the tab says what happened instead of reloading again forever.
    window.dispatchEvent(new ErrorEvent('error', { message: CHUNK_MESSAGE }));
    expect(document.getElementById('root')?.textContent ?? '').toContain('Phiên bản mới đã sẵn sàng');
  });

  it('ignores errors that are not chunk failures', () => {
    window.dispatchEvent(new ErrorEvent('error', { message: 'Không thể tải danh sách' }));
    expect(document.getElementById('root')?.innerHTML).toBe('');
  });
});
