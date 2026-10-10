import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type * as AdvanceQueries from '../hooks/useQueries';
import { ToastProvider } from '../components/shared/Toast';
import AdminAdvancesPage from './AdminAdvancesPage';

/**
 * A page mixes hooks from six react-query modules through the `useQueries`
 * barrel. When one of them hands back nothing — a module the dev server is
 * midway through replacing, a hook disabled for the current role, a mocked
 * module — reading `.isPending` off it used to take the whole route down:
 *
 *   TypeError: Cannot read properties of undefined (reading 'isPending')
 *     at AdminAdvancesPage (AdminAdvancesPage.tsx)
 *
 * QA hit exactly that on /advances and got the route's error screen instead of
 * the advance list (kanban 101026101500). A missing hook must read as "no
 * decision in flight", never as a crash.
 */

const request = {
  id: 60,
  requesterName: 'Nguyễn Sĩ Quân',
  requesterId: 12,
  amount: 20_000_000,
  createdAt: '2026-10-07T00:00:00.000Z',
  status: 'PENDING',
  reason: 'Tạm ứng nâng hạ',
  approverName: null,
};

const hooks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
  restore: vi.fn(),
  /** Each entry is the value the corresponding hook returns; undefined = "the hook returned nothing". */
  returns: {} as Record<string, unknown>,
}));

vi.mock('../hooks/useQueries', async (importOriginal) => {
  const actual = await importOriginal<typeof AdvanceQueries>();
  return {
    ...actual,
    useAdminAdvanceRequests: () => ({ data: { items: [request] }, isLoading: false, error: null, refetch: vi.fn() }),
    useAdminAdvanceBalances: () => ({ data: { items: [], totalOutstanding: '0' } }),
    useApproveAdvanceRequest: () => hooks.returns.approve,
    useRejectAdvanceRequest: () => hooks.returns.reject,
    useRestoreAdvanceRequest: () => hooks.returns.restore,
  };
});
vi.mock('../hooks/useFocusDeepLink', () => ({ useFocusDeepLink: () => undefined }));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 10, year: 2026, setMonthYear: vi.fn() }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));

function mount() {
  return render(
    <MemoryRouter initialEntries={['/advances']}>
      <ToastProvider>
        <AdminAdvancesPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const approveButton = () => screen.getByRole('button', { name: 'Duyệt yêu cầu của Nguyễn Sĩ Quân' });

describe('admin advances tolerates a hook that returns nothing (kanban 101026101500)', () => {
  it('renders the list when all three decision hooks return undefined', () => {
    hooks.returns = { approve: undefined, reject: undefined, restore: undefined };
    mount();

    expect(screen.getByText('Quản lý tạm ứng')).not.toBeNull();
    // The page renders the desktop grid and the mobile card list; both carry the row.
    expect(screen.getAllByText('Nguyễn Sĩ Quân').length).toBeGreaterThan(0);
    // The row still offers its decision and stays interactive.
    expect(approveButton().hasAttribute('disabled')).toBe(false);
  });

  it('renders the list when only the restore hook returns undefined', () => {
    // The undo hook was the newest export; a stale module graph is exactly how
    // a single hook goes missing while the rest keep working.
    hooks.returns = {
      approve: { isPending: false, variables: undefined, mutate: hooks.approve },
      reject: { isPending: false, variables: undefined, mutate: hooks.reject },
      restore: undefined,
    };
    mount();

    expect(screen.getAllByText('Nguyễn Sĩ Quân').length).toBeGreaterThan(0);
    expect(approveButton().hasAttribute('disabled')).toBe(false);
  });

  it('marks the in-flight decision, keeping approval ahead of rejection', () => {
    hooks.returns = {
      approve: { isPending: true, variables: request.id, mutate: hooks.approve },
      reject: { isPending: true, variables: request.id, mutate: hooks.reject },
      restore: undefined,
    };
    mount();

    // pendingId/pendingKind resolve to the approve decision, so both decision
    // buttons on that row are held while it is in flight.
    expect(approveButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Từ chối yêu cầu của Nguyễn Sĩ Quân' }).hasAttribute('disabled')).toBe(true);
  });
});
