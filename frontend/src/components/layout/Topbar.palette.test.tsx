import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Role } from '@tingting/shared';
import { Topbar } from './Topbar';
import { SearchProvider } from '../../context/SearchContext';

vi.mock('../../hooks/useCatalogQueries', () => ({ useSalaryPeriod: () => ({ data: null }) }));
vi.mock('../../hooks/useMonth', () => ({ useMonth: () => ({ month: 10, year: 2026, setMonthYear: vi.fn() }) }));
vi.mock('../../hooks/useTopbarEntrance', () => ({ useTopbarEntrance: () => ({ current: null }) }));
vi.mock('./NotificationBell', () => ({ NotificationBell: () => null }));
vi.mock('../agent/AgentAssistant', () => ({ AgentAssistant: () => null }));
beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(cleanup);

function renderTopbar() {
  return render(
    <MemoryRouter>
      <SearchProvider>
        <Topbar
          user={{ role: Role.FORWARDER, fullName: 'Nguyễn Sĩ Quân', username: 'quan' }}
          isDriver={false}
          sidebarOpen
          menuButtonRef={{ current: null }}
          pageTitle="Chuyến đi"
          onToggleSidebar={() => {}}
        />
      </SearchProvider>
    </MemoryRouter>,
  );
}

it('⌘K opens the palette listing the destinations the role can reach', () => {
  const view = renderTopbar();
  expect(view.container.textContent).not.toContain('Tạm ứng');

  fireEvent.keyDown(window, { key: 'k', metaKey: true });

  expect(screen.getByText('TRANG')).toBeTruthy();
  const input = screen.getByLabelText('Tìm trang, cấu hình hoặc thao tác') as HTMLInputElement;
  expect(document.activeElement).toBe(input);
  expect(screen.getByRole('button', { name: /Chuyến đi/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Tạm ứng/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Phiếu thanh toán/ })).toBeTruthy();
});

it('narrows the palette to the typed query', () => {
  renderTopbar();
  fireEvent.focus(screen.getByLabelText('Tìm trang, cấu hình hoặc thao tác'));
  fireEvent.change(screen.getByLabelText('Tìm trang, cấu hình hoặc thao tác'), { target: { value: 'chu' } });

  expect(screen.getByRole('button', { name: /Chuyến đi/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Tạm ứng/ })).toBeNull();
});
