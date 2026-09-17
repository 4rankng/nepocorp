import { useRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Layout from '../Layout';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, role: 'DRIVER', username: 'driver', fullName: 'Lái xe' }, logout: vi.fn(), updateUser: vi.fn() }),
}));
vi.mock('../../hooks/useQueries', () => ({ useBadgeCounts: () => ({ data: undefined }) }));
vi.mock('../../hooks/useBottomNavAnimations', () => ({ useBottomNavAnimations: () => useRef(null) }));
vi.mock('../layout/Sidebar', () => ({ Sidebar: ({ onToggleUserMenu }: { onToggleUserMenu: () => void }) => <button onClick={onToggleUserMenu}>Menu người dùng</button> }));
vi.mock('../layout/Topbar', () => ({ Topbar: () => null }));
vi.mock('../layout/ProfileModal', () => ({ ProfileModal: () => null }));
vi.mock('../layout/PasswordModal', () => ({ PasswordModal: () => null }));

afterEach(() => vi.unstubAllGlobals());

function renderDriver(mobile: boolean) {
  vi.stubGlobal('innerWidth', mobile ? 390 : 1440);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: mobile, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  return render(<MemoryRouter><Layout><h1>Hành trình</h1></Layout></MemoryRouter>);
}

describe('driver account navigation', () => {
  it('does not mount the mobile account sheet for the desktop account menu', () => {
    renderDriver(false);
    fireEvent.click(screen.getByRole('button', { name: 'Menu người dùng' }));
    expect(screen.queryByRole('dialog', { name: 'Tài khoản' })).toBeNull();
  });

  it('opens a named dialog on mobile and restores focus when Escape closes it', () => {
    renderDriver(true);
    const account = screen.getByRole('button', { name: 'Tài khoản' });
    account.focus();
    fireEvent.click(account);
    expect(screen.getByRole('dialog', { name: 'Tài khoản' })).toBeTruthy();
    const close = screen.getByRole('button', { name: 'Đóng tài khoản' });
    expect(document.activeElement).toBe(close);
    expect(account.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(account.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(account);
  });
});
