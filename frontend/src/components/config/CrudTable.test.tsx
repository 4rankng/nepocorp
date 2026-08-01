import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrudTable } from './CrudTable';

interface TestItem {
  id: number;
  name: string;
}

const testState = vi.hoisted(() => ({
  data: [{ id: 1, name: 'Phí bảo hiểm' }],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
  setEditingId: vi.fn(),
  setShowAddForm: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: testState.data,
    isPending: testState.isPending,
    isError: testState.isError,
    refetch: testState.refetch,
  }),
}));

vi.mock('../../hooks/useCRUD', () => ({
  useCRUD: () => ({
    saving: false,
    deleting: null,
    error: null,
    showAddForm: false,
    editingId: null,
    setEditingId: testState.setEditingId,
    setShowAddForm: testState.setShowAddForm,
    cancelForm: vi.fn(),
    doCreate: vi.fn(),
    doUpdate: vi.fn(),
    doDelete: vi.fn(),
  }),
}));

vi.mock('../UI', () => ({
  PageHeader: ({ title, action }: { title: ReactNode; action?: ReactNode }) => (
    <header data-testid="page-header">
      <h1>{title}</h1>
      {action}
    </header>
  ),
  Panel: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  Modal: () => null,
  useConfirm: () => ({ confirm: vi.fn(), dialog: null }),
}));

vi.mock('../../design-system', () => ({
  EmptyState: () => <div>Trống</div>,
}));

function renderForm() {
  return null;
}

describe('CrudTable layout variants', () => {
  beforeEach(() => {
    testState.setEditingId.mockClear();
    testState.setShowAddForm.mockClear();
    testState.refetch.mockClear();
    testState.isPending = false;
    testState.isError = false;
  });

  it('uses native buttons for compact items and can place creation in the header', () => {
    render(
      <MemoryRouter>
        <CrudTable<TestItem>
          title="Hạng mục chi phí"
          description="Mô tả"
          endpoint="/expense-categories"
          createActionPlacement="header"
          compactItemAriaLabel={(item) => `Chỉnh sửa ${item.name}`}
          renderCompactItem={(item) => <span>{item.name}</span>}
          renderForm={renderForm}
        />
      </MemoryRouter>,
    );

    const row = screen.getByRole('button', { name: 'Chỉnh sửa Phí bảo hiểm' });
    expect(row.tagName).toBe('BUTTON');
    expect(screen.getByTestId('page-header').contains(screen.getByRole('button', { name: 'Thêm mới' }))).toBe(true);
    expect(screen.queryByRole('table')).toBeNull();

    fireEvent.click(row);
    expect(testState.setEditingId).toHaveBeenCalledWith(1);
  });

  it('keeps the existing table rendering as the default', () => {
    render(
      <MemoryRouter>
        <CrudTable<TestItem>
          title="Danh mục"
          description="Mô tả"
          endpoint="/items"
          columns={[{ header: 'Tên', render: item => item.name }]}
          renderForm={renderForm}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('table')).not.toBeNull();
    expect(screen.getByText('Phí bảo hiểm')).not.toBeNull();
    expect(screen.getByTestId('page-header').contains(screen.getByRole('button', { name: 'Thêm mới' }))).toBe(false);
  });

  it('does not present loading or failed requests as an empty catalogue', () => {
    testState.isPending = true;
    const { rerender } = render(
      <MemoryRouter>
        <CrudTable<TestItem>
          title="Hạng mục chi phí"
          description="Mô tả"
          endpoint="/expense-categories"
          renderCompactItem={(item) => <span>{item.name}</span>}
          renderForm={renderForm}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('status').textContent).toContain('Đang tải dữ liệu');
    expect(screen.queryByText('Trống')).toBeNull();

    testState.isPending = false;
    testState.isError = true;
    rerender(
      <MemoryRouter>
        <CrudTable<TestItem>
          title="Hạng mục chi phí"
          description="Mô tả"
          endpoint="/expense-categories"
          renderCompactItem={(item) => <span>{item.name}</span>}
          renderForm={renderForm}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert').textContent).toContain('Không thể tải dữ liệu');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(testState.refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Trống')).toBeNull();
  });
});
