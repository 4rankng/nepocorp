import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import { Role } from '@tingting/shared';
import { qk } from '../api/keys';
import { getToken } from '../design-system/hooks/useToken';
import { disposeAgentSocket, clearAgentConversation } from '../api/agentClient';
import { onSessionExpired } from '../lib/api/session';

export interface AuthUser {
  userId: number;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  fullName?: string;
  capabilities?: string[];
  /** Assistant (bot) enabled for this deployment (BOT_ENABLE). Launcher hides when false. */
  botEnabled?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Pick<AuthUser, 'email' | 'phone' | 'username' | 'fullName'>) => void;
  isAuthenticated: boolean;
  loading: boolean;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

/** Decode a JWT payload without a library; null if malformed or expired. */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

async function fetchAuthUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token || isTokenExpired(token)) {
    api.clearToken();
    return null;
  }
  try {
    return await api.get<AuthUser>('/auth/me');
  } catch (err) {
    // An older auth request can finish after another account has signed in.
    // Only discard the rejected token that this request actually used.
    if (err instanceof ApiError && err.status === 401 && getToken() === token) api.clearToken();
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSessionData = useCallback(() => {
    // Keep the auth observer, but cancel its old read before publishing a new
    // session. Otherwise a background /auth/me response can replace that user.
    void queryClient.cancelQueries({ queryKey: qk.auth.me, exact: true });
    // Most domain keys are shared across accounts. Removing them also cancels
    // pending queries so an old response cannot populate the next user's cache.
    // Keep the auth observer subscribed while publishing the new session.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    queryClient.getMutationCache().clear();
  }, [queryClient]);

  // Cached at the TanStack level: login/logout invalidates the key, not the
  // entire app. The previous useEffect+fetch approach bypassed the cache
  // entirely, so every page mount re-fetched /auth/me.
  const { data: user = null, isLoading } = useQuery({
    queryKey: qk.auth.me,
    queryFn: fetchAuthUser,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
        identifier,
        password,
      });
      clearSessionData();
      api.setToken(res.token);
      setSessionExpired(false);
      queryClient.setQueryData(qk.auth.me, res.user);
    },
    [queryClient, clearSessionData],
  );

  const logout = useCallback(() => {
    // Idempotent: during logout, in-flight requests may also expire the session.
    // Short-circuit once the cached user is already null to avoid redundant
    // token clears / cache writes.
    if (queryClient.getQueryData(qk.auth.me) === null) return;
    disposeAgentSocket(); // drop the assistant socket so a stale token isn't reused
    clearAgentConversation(); // forget the resumed thread so the next user starts fresh
    clearSessionData();
    api.clearToken();
    queryClient.setQueryData(qk.auth.me, null);
  }, [queryClient, clearSessionData]);

  useEffect(
    () => onSessionExpired(() => {
      setSessionExpired(true);
      logout();
    }),
    [logout],
  );

  const updateUser = useCallback(
    (updates: Pick<AuthUser, 'email' | 'phone' | 'username' | 'fullName'>) => {
      queryClient.setQueryData<AuthUser | null>(qk.auth.me, (prev) =>
        prev ? { ...prev, ...updates } : prev,
      );
    },
    [queryClient],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        updateUser,
        isAuthenticated: !!user,
        loading: isLoading,
        sessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook co-located with its Provider; splitting would fragment a standard React context pattern
export function useAuth() {
  return useContext(AuthContext);
}
