import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Role } from '../utils';
import { UserTable } from './UserTable';

const user = {
  id: 9, username: 'qa-driver', fullName: 'Tài xế kiểm thử',
  email: 'driver@example.test', phone: '0900000009', role: Role.DRIVER,
  status: 'ACTIVE', createdAt: '2026-09-17T00:00:00Z',
  driverId: 9, assignedTruckId: null, baseSalary: null, socialInsurance: null,
};

function setup() {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(<UserTable
    paginated={[user]} filteredTotal={1} total={1} staffCount={0}
    driverCount={1} inactiveCount={0} filter="all" search=""
    canManage canDelete canEditDriversOnly={false} deleting={null} currentUserId={1}
    onEdit={onEdit} onDelete={onDelete} onAdd={vi.fn()}
    onFilterChange={vi.fn()} onSearchChange={vi.fn()} sortBy={null} sortOrder="asc"
    onSort={vi.fn()} currentPage={1} pageSize={10} onPageChange={vi.fn()}
  />);
  return { trigger: screen.getByRole('button', { name: 'Mở thao tác cho Tài xế kiểm thử' }), onEdit, onDelete };
}

afterEach(cleanup);

it('dismisses the user action menu with Escape and returns focus without editing or deleting', () => {
  const { trigger, onEdit, onDelete } = setup();
  trigger.focus();
  fireEvent.click(trigger);
  const deleteAction = screen.getByRole('menuitem', { name: 'Xoá' });
  deleteAction.focus();
  fireEvent.keyDown(deleteAction, { key: 'Escape' });
  expect(screen.queryByRole('menu')).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
  expect(onEdit).not.toHaveBeenCalled();
  expect(onDelete).not.toHaveBeenCalled();
});

it('keeps outside-click dismissal working and stops claiming Escape after the menu closes', () => {
  const { trigger } = setup();
  fireEvent.click(trigger);
  fireEvent.keyDown(document.body, { key: 'a' });
  expect(screen.getByRole('menu')).toBeTruthy();
  fireEvent.click(document.body);
  expect(screen.queryByRole('menu')).toBeNull();
  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  document.body.dispatchEvent(escape);
  expect(escape.defaultPrevented).toBe(false);
});
