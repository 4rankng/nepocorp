import React from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthedQuery } from './useAuthedQuery';
import { api, ApiError } from '../../lib/api';
import { onSessionExpired } from '../../lib/api/session';
import { getToken } from './useToken';

const { logout } = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ logout }) }));
let client: QueryClient;
afterEach(() => { cleanup(); client?.clear(); api.clearToken(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function setup() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useAuthedQuery({ queryKey: ['restricted'], queryFn: () => api.get('/restricted') }), {
    wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
describe('authenticated query failures', () => {
  it('keeps the current session on permission denial', async () => {
    api.setToken('current');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 403 })));
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ApiError));
    expect(logout).not.toHaveBeenCalled();
    expect(getToken()).toBe('current');
  });
  it('does not sign out a newer session after an old query returns 401', async () => {
    api.setToken('old');
    let finish!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise<Response>(resolve => { finish = resolve; })));
    const { result } = setup();
    api.setToken('new');
    finish(new Response('{}', { status: 401 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(logout).not.toHaveBeenCalled();
    expect(getToken()).toBe('new');
  });
  it('still expires a rejected current token through the API client', async () => {
    api.setToken('expired');
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    try {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
      const { result } = setup();
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(listener).toHaveBeenCalledOnce();
      expect(getToken()).toBeNull();
    } finally { unsubscribe(); }
  });
});
