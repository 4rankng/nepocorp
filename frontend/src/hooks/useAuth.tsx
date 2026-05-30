import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Role } from '@nepocorp/shared';

export interface AuthUser {
  userId: number;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  name?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Pick<AuthUser, 'email' | 'phone' | 'username'>) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !!localStorage.getItem('token'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get<AuthUser>('/auth/me').then(setUser).catch(() => {
        api.clearToken();
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier, password });
    api.setToken(res.token);
    setUser(res.user);
    setLoading(false);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Pick<AuthUser, 'email' | 'phone' | 'username'>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
