import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Supplier } from '@tingting/shared';
import FuelSuppliersConfigPage from './FuelSuppliersConfigPage';

interface MockCrudTableProps {
  title: string;
  description: string;
  showDelete?: boolean;
  createActionPlacement?: string;
  filterItems: (items: Supplier[]) => Supplier[];
  renderCompactItem: (supplier: Supplier) => ReactNode;
  renderForm: (props: {
    saving: boolean;
    item?: Supplier;
    onSave: (data: Record<string, unknown>) => void;
    onCancel: () => void;
  }) => ReactNode;
}

let onSave = vi.fn();

vi.mock('../../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
}));

vi.mock('../../components/config/CrudTable', () => ({
  CrudTable: ({ title, description, showDelete, createActionPlacement, filterItems, renderCompactItem, renderForm }: MockCrudTableProps) => {
    const suppliers: Supplier[] = [
      { id: 27, name: 'Petro', contactPerson: null, phone: null, taxCode: null, note: null, status: 'ACTIVE', linkedCustomerId: null, isFuelSupplier: true, createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', deletedAt: null },
      { id: 29, name: 'Gara Thành Đông', contactPerson: null, phone: null, taxCode: null, note: null, status: 'ACTIVE', linkedCustomerId: null, isFuelSupplier: false, createdAt: '2026-08-21T00:00:00.000Z', updatedAt: '2026-08-21T00:00:00.000Z', deletedAt: null },
    ];
    return (
      <section data-action-placement={createActionPlacement} data-show-delete={String(showDelete)}>
        <h1>{title}</h1>
        <p>{description}</p>
        {filterItems(suppliers).map(supplier => <article key={supplier.id}>{renderCompactItem(supplier)}</article>)}
        {renderForm({ saving: false, onSave, onCancel: vi.fn() })}
      </section>
    );
  },
}));

describe('FuelSuppliersConfigPage', () => {
  beforeEach(() => {
    onSave = vi.fn();
  });

  it('limits this setting to fuel suppliers and preserves supplier records instead of offering deletion', () => {
    const { container } = render(<FuelSuppliersConfigPage />);

    expect(container.querySelector('section')?.getAttribute('data-action-placement')).toBe('header');
    expect(container.querySelector('section')?.getAttribute('data-show-delete')).toBe('false');
    expect(screen.getByText('Petro')).not.toBeNull();
    expect(screen.queryByText('Gara Thành Đông')).toBeNull();
    expect(screen.getByText('Chưa có thông tin liên hệ')).not.toBeNull();
  });

  it('creates a fuel supplier and permits optional contact values to be cleared', () => {
    render(<FuelSuppliersConfigPage />);

    fireEvent.change(screen.getByLabelText('Tên cây dầu / nhà cung cấp'), { target: { value: 'Cây dầu mới' } });
    fireEvent.change(screen.getByLabelText('Trạng thái'), { target: { value: 'INACTIVE' } });
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));

    expect(onSave).toHaveBeenCalledWith({
      name: 'Cây dầu mới',
      contactPerson: null,
      phone: null,
      status: 'INACTIVE',
      isFuelSupplier: true,
    });
  });
});
