import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@tingting/shared';
import { AuthProvider, useAuth } from './useAuth';
import { qk } from '../api/keys';
import { ApiError } from '../lib/api';

const mocks = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), clearToken: vi.fn(), setToken: vi.fn(),
  getToken: vi.fn(), dispose: vi.fn(), clearConversation: vi.fn(),
}));
vi.mock('../lib/api', async (original) => ({
  ...(await original<object>()),
  api: { get: mocks.get, post: mocks.post, clearToken: mocks.clearToken, setToken: mocks.setToken },
}));
vi.mock('../design-system/hooks/useToken', () => ({ getToken: mocks.getToken }));
vi.mock('../api/agentClient', () => ({
  disposeAgentSocket: mocks.dispose, clearAgentConversation: mocks.clearConversation,
}));

const firstUser = { userId: 1, username: 'first', email: null, phone: null, role: Role.DRIVER };
const secondUser = { ...firstUser, userId: 2, username: 'second' };
let client: QueryClient;
function setup() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(qk.auth.me, firstUser);
  return renderHook(() => useAuth(), {
    wrapper: ({ children }) => <QueryClientProvider client={client}><AuthProvider>{children}</AuthProvider></QueryClientProvider>,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getToken.mockReturnValue(null);
  mocks.setToken.mockImplementation((token) => mocks.getToken.mockReturnValue(token));
  mocks.clearToken.mockImplementation(() => mocks.getToken.mockReturnValue(null));
});
afterEach(() => { cleanup(); client?.clear(); });

describe('account session cache isolation', () => {
  it.each(['success', 'rejected'] as const)('ignores an old auth refresh after account switching (%s)', async (outcome) => {
    const { result } = setup();
    mocks.getToken.mockReturnValue(`header.${btoa(JSON.stringify({ exp: 9999999999 }))}.signature`);
    let finish!: (user: typeof firstUser) => void;
    let fail!: (error: Error) => void;
    mocks.get.mockReturnValue(new Promise((resolve, reject) => { finish = resolve; fail = reject; }));
    const refresh = client.invalidateQueries({ queryKey: qk.auth.me });
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/auth/me'));
    mocks.post.mockResolvedValue({ token: 'second-token', user: secondUser });
    await act(() => result.current.login('second', 'password'));
    if (outcome === 'success') finish(firstUser);
    else fail(new ApiError(401, null, 'expired'));
    await act(async () => { await refresh; });
    await waitFor(() => expect(result.current.user?.userId).toBe(2));
    expect(mocks.getToken()).toBe('second-token');
    expect(mocks.clearToken).not.toHaveBeenCalled();
  });

  it('removes private data on logout and fetches the next account data afresh', async () => {
    const { result } = setup();
    client.setQueryData(['my-trips'], [{ id: 1, driver: 'first' }]);
    act(() => result.current.logout());
    await waitFor(() => expect(result.current.user).toBeNull());
    expect(client.getQueryData(['my-trips'])).toBeUndefined();
    mocks.post.mockResolvedValue({ token: 'second-token', user: secondUser });
    await act(() => result.current.login('second', 'password'));
    await waitFor(() => expect(result.current.user?.userId).toBe(2));
    expect(client.getQueryData(['my-trips'])).toBeUndefined();
    expect(mocks.dispose).toHaveBeenCalled();
  });

  it('cancels old in-flight data so it cannot repopulate the next session', async () => {
    const { result } = setup();
    let resolveOld!: (value: string[]) => void;
    const oldRequest = client.fetchQuery({
      queryKey: ['my-earnings'],
      queryFn: () => new Promise<string[]>((resolve) => { resolveOld = resolve; }),
    }).catch(() => undefined);
    act(() => result.current.logout());
    mocks.post.mockResolvedValue({ token: 'second-token', user: secondUser });
    await act(() => result.current.login('second', 'password'));
    resolveOld(['first account salary']);
    await oldRequest;
    expect(client.getQueryData(['my-earnings'])).toBeUndefined();
  });

  it('clears stale session data on successful login even if logout was bypassed', async () => {
    const { result } = setup();
    client.setQueryData(['payables'], ['private amounts']);
    mocks.post.mockResolvedValue({ token: 'second-token', user: secondUser });
    await act(() => result.current.login('second', 'password'));
    expect(client.getQueryData(['payables'])).toBeUndefined();
    await waitFor(() => expect(result.current.user?.userId).toBe(2));
  });
});
