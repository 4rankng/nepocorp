import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ExpenseCategory } from '@tingting/shared';
import ExpenseCategoriesConfigPage from './ExpenseCategoriesConfigPage';

interface MockCrudTableProps {
  title: string;
  description: string;
  createActionPlacement?: string;
  renderCompactItem: (item: ExpenseCategory) => ReactNode;
}

vi.mock('../../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
}));

vi.mock('../../components/config/CrudTable', () => ({
  CrudTable: ({ title, description, createActionPlacement, renderCompactItem }: MockCrudTableProps) => {
    const categories: ExpenseCategory[] = [
      {
        id: 1,
        name: 'Phí bảo hiểm',
        isRenewable: true,
        reminderLeadDays: 7,
        status: 'ACTIVE',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        deletedAt: null,
      },
      {
        id: 2,
        name: 'Thông hàn két nước',
        isRenewable: false,
        reminderLeadDays: 7,
        status: 'INACTIVE',
        createdAt: '2026-08-01T00:00:00.000Z',
        updatedAt: '2026-08-01T00:00:00.000Z',
        deletedAt: null,
      },
    ];

    return (
      <section data-action-placement={createActionPlacement}>
        <h1>{title}</h1>
        <p>{description}</p>
        {categories.map(category => (
          <article key={category.id}>
            {renderCompactItem(category)}
          </article>
        ))}
      </section>
    );
  },
}));

describe('ExpenseCategoriesConfigPage compact catalogue', () => {
  it('groups renewal details into a compact row and places creation in the page header', () => {
    const { container } = render(<ExpenseCategoriesConfigPage />);

    expect(container.querySelector('section')?.getAttribute('data-action-placement')).toBe('header');
    expect(screen.getByText('Phân loại chi phí và thiết lập lịch nhắc gia hạn')).not.toBeNull();
    expect(screen.getByText(/Định kỳ.*Nhắc trước 7 ngày/)).not.toBeNull();
    expect(screen.getByText(/Một lần.*Không nhắc/)).not.toBeNull();
    expect(screen.getByText('Hoạt động')).not.toBeNull();
    expect(screen.getByText('Ngừng')).not.toBeNull();
  });
});
