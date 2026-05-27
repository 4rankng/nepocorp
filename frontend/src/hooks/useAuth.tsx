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
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

const IS_DEMO = !window.location.hostname.includes('localhost') || !!localStorage.getItem('demo_mode');

const DEMO_USERS: Record<string, { user: AuthUser; password: string }> = {
  giamdoc: { password: 'admin123', user: { userId: 1, username: 'giamdoc', email: 'giamdoc@nepocorp.vn', phone: null, role: Role.ADMIN, name: 'Giám đốc' } },
  ketoan: { password: 'admin123', user: { userId: 2, username: 'ketoan', email: 'ketoan@nepocorp.vn', phone: null, role: Role.ACCOUNTANT, name: 'Kế toán' } },
  laixe: { password: 'admin123', user: { userId: 3, username: 'laixe', email: 'laixe@nepocorp.vn', phone: null, role: Role.DRIVER, name: 'Lái xe' } },
};

function demoLogin(identifier: string, password: string): AuthUser | null {
  const entry = DEMO_USERS[identifier.toLowerCase()];
  if (entry && entry.password === password) return entry.user;
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('demo_user');
    if (IS_DEMO && stored) {
      try { setUser(JSON.parse(stored)); return; } catch { /* ignore */ }
    }
    const token = localStorage.getItem('token');
    if (token) {
      api.get<AuthUser>('/auth/me').then(setUser).catch(() => {
        api.clearToken();
        setUser(null);
      });
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    if (IS_DEMO) {
      const demoUser = demoLogin(identifier, password);
      if (demoUser) {
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        setUser(demoUser);
        return;
      }
    }
    const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { identifier, password });
    api.setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    api.clearToken();
    localStorage.removeItem('demo_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
