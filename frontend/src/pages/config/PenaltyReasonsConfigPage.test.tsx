import { render, screen } from '@testing-library/react';
import type { PenaltyReason } from '@tingting/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PenaltyReasonsConfigPage from './PenaltyReasonsConfigPage';

const { mockUseQuery } = vi.hoisted(() => ({ mockUseQuery: vi.fn() }));

vi.mock('@tanstack/react-query', () => ({ useQuery: mockUseQuery }));

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
}));
vi.mock('../../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
vi.mock('../../lib/api', () => ({ api: { get: vi.fn() } }));
vi.mock('../../api/configClient', () => ({ configClient: { getPenaltyReasons: vi.fn() } }));
vi.mock('../../api/keys', () => ({ qk: { penalties: { list: ['penalties'], stats: ['penalty-stats'] } } }));
vi.mock('../../hooks/useCRUD', () => ({
  useCRUD: () => ({
    showAddForm: false,
    editingId: null,
    saving: false,
    setShowAddForm: vi.fn(),
    setEditingId: vi.fn(),
    cancelForm: vi.fn(),
    doCreate: vi.fn(),
    doUpdate: vi.fn(),
    doDelete: vi.fn(),
  }),
}));
vi.mock('../../components/UI', () => ({
  Modal: () => null,
  useConfirm: () => ({ confirm: vi.fn(), dialog: null }),
  Btn: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  FormGroup: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  PageHeader: ({ title, action }: { title: string; action: React.ReactNode }) => <header><h1>{title}</h1>{action}</header>,
}));
vi.mock('../../lib/emptyIllustrations', () => ({ resolveEmptyIllustration: () => '' }));

const refetch = vi.fn();

describe('PenaltyReasonsConfigPage', () => {
  beforeEach(() => {
    mockUseQuery
      .mockImplementation(({ queryKey }: { queryKey: string[] }) => (
        queryKey[0] === 'penalties'
          ? {
              data: [{
                id: 1,
                reasonText: null,
                defaultAmount: '100000',
                severity: 'mid',
                createdAt: '2026-08-22T00:00:00.000Z',
                updatedAt: '2026-08-22T00:00:00.000Z',
              }] as unknown as PenaltyReason[],
              refetch,
              isLoading: false,
            }
          : { data: undefined, refetch, isLoading: false }
      ));
  });

  it('renders when a legacy penalty reason has no reason text', () => {
    render(<PenaltyReasonsConfigPage />);

    expect(screen.getByRole('heading', { name: 'Danh mục lỗi vi phạm' })).not.toBeNull();
    expect(screen.getByText('Chưa đặt tên')).not.toBeNull();
  });
});
