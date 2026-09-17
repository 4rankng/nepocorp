import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';
import { onSessionExpired } from './api/session';
import { getToken } from '../design-system/hooks/useToken';

describe('API session expiry', () => {
  beforeEach(() => {
    api.clearToken();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    api.clearToken();
  });

  it('clears a rejected token and notifies the authenticated shell on 401', async () => {
    api.setToken('expired-token');
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Token hết hạn hoặc không hợp lệ' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(api.post('/trips', { customerId: 1 })).rejects.toBeInstanceOf(ApiError);

    expect(getToken()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('keeps an unauthenticated login 401 as a normal credential error', async () => {
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Sai thông tin đăng nhập' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    ));

    await expect(api.post('/auth/login', { identifier: 'x', password: 'y' }))
      .rejects.toBeInstanceOf(ApiError);

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('does not clear a newer session when an old request returns 401 late', async () => {
    api.setToken('old-token');
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    let resolveResponse!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    ));

    const oldRequest = api.get('/trips');
    api.setToken('new-token');
    resolveResponse(new Response(JSON.stringify({ error: 'Token hết hạn' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(oldRequest).rejects.toThrow('Phiên đăng nhập đã thay đổi');
    expect(getToken()).toBe('new-token');
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it.each(['query', 'mutation', 'text', 'blob', 'conflict'] as const)('rejects stale successful %s responses before they can update a new account', async (kind) => {
    api.setToken('old-token');
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(resolve => { finish = resolve; })));
    const oldRequest = kind === 'query' ? api.get('/trips')
      : (kind === 'mutation' || kind === 'conflict') ? api.put('/trips/1', {})
      : kind === 'text' ? api.getForText('/statement') : api.getBlob('/export');
    api.setToken('new-token');
    finish(new Response(JSON.stringify({ privateData: 'previous account' }), { status: kind === 'conflict' ? 409 : 200 }));
    // Keep this outside HTTP conflict handling: trip saves retry actual 409s.
    await expect(oldRequest).rejects.toThrow('Phiên đăng nhập đã thay đổi');
    await expect(oldRequest).rejects.not.toBeInstanceOf(ApiError);
    expect(getToken()).toBe('new-token');
  });

  it.each([200, 401, 409])('guards session changes while reading a %s response body', async (status) => {
    api.setToken('old-token');
    let finishBody!: (body: object) => void;
    let started!: () => void;
    const bodyStarted = new Promise<void>(resolve => { started = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status, ok: status === 200,
      json: () => { started(); return new Promise<object>(resolve => { finishBody = resolve; }); },
    }));
    const request = api.put('/trips/1', {});
    await bodyStarted;
    api.setToken('new-token');
    finishBody({ error: 'old response' });
    await expect(request).rejects.toThrow('Phiên đăng nhập đã thay đổi');
    await expect(request).rejects.not.toBeInstanceOf(ApiError);
    expect(getToken()).toBe('new-token');
  });
});

describe('Vitest infrastructure', () => {
  it('runs basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBeTruthy();
    expect([1, 2, 3]).toHaveLength(3);
  });

  it('supports jsdom environment', () => {
    // jsdom provides a minimal DOM implementation
    const div = document.createElement('div');
    div.textContent = 'test';
    expect(div.textContent).toBe('test');
  });

  it('supports module resolution via workspace package', async () => {
    // Verify the @tingting/shared workspace package resolves correctly
    const mod = await import('@tingting/shared');
    expect(mod.round2dp).toBeDefined();
  });
});
