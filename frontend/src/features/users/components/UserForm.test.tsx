import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '@tingting/shared';
import { AddPanel, EditPanel } from './UserForm';
import type { UserRow } from '../utils';

vi.mock('../../../hooks/useAnimatedOverlay', () => ({
  useAnimatedOverlay: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => ({ visible: isOpen, handleClose: onClose }),
}));

// The role dropdown offers only roles the viewer may assign, which is read from
// the auth context. Default to ADMIN (sees every role) and override per test.
// vi.hoisted runs before the module imports initialise, so the role is spelled
// as a string rather than read from the Role enum here.
const authMock = vi.hoisted(() => ({ user: { role: 'ADMIN' } as { role: string } | null }));
vi.mock('../../../hooks/useAuth', () => ({ useAuth: () => ({ user: authMock.user }) }));

describe('account form input labels', () => {
  it.each(['add', 'edit'])('connects %s account labels to editable controls and exposes validation state', mode => {
    const common = { isOpen: true, saving: false, error: null, truckList: [], onClose: vi.fn(), onSave: vi.fn() };
    if (mode === 'add') render(<AddPanel {...common} />);
    else render(<EditPanel {...common} isMe={false} user={{ id: 1, role: Role.DRIVER, status: 'ACTIVE', fullName: 'Lái xe QA', username: 'qa', email: '', phone: '' } as UserRow} />);

    const labels = ['Họ và tên', 'Username', 'Email', 'Số điện thoại'];
    for (const label of labels) {
      const input = screen.getByLabelText(label);
      expect(input).toBeInstanceOf(HTMLInputElement);
      expect((document.querySelector(`label[for="${input.id}"]`) as HTMLLabelElement).control).toBe(input);
    }
    const email = screen.getByLabelText('Email');
    fireEvent.change(email, { target: { value: 'invalid' } });
    expect(email.getAttribute('aria-invalid')).toBe('true');
    fireEvent.change(email, { target: { value: 'qa@example.test' } });
    expect(email.hasAttribute('aria-invalid')).toBe(false);
    expect(screen.getByLabelText(mode === 'add' ? 'Mật khẩu *' : 'Mật khẩu mới (để trống = không thay đổi)')).toBeInstanceOf(HTMLInputElement);
  });
});

/**
 * The API already refuses a non-ADMIN assigning ADMIN. The form used to offer
 * the option anyway, so a MANAGER could fill in the whole account and only be
 * told on save that the role was unacceptable (kanban 101026003220).
 */
describe('assignable roles in the account form', () => {
  const openAdd = () => render(
    <AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={vi.fn()} />,
  );
  const roleOptions = () => {
    // The role select has no linked <label for>, so find it by content: it is
    // the only combobox whose options are the role values.
    const select = screen.getAllByRole('combobox').find(el =>
      Array.from(el.querySelectorAll('option')).some(o => o.value === Role.DRIVER));
    if (!select) throw new Error('role select not found');
    return Array.from(select.querySelectorAll('option')).map(o => o.value);
  };

  it('offers every role to an ADMIN', () => {
    authMock.user = { role: 'ADMIN' };
    openAdd();
    // The add form also carries an empty placeholder option, so compare on the
    // roles themselves rather than on a raw option count.
    const roles = Object.values(Role);
    expect(roleOptions().filter(Boolean).sort()).toEqual([...roles].sort());
  });

  it('hides ADMIN from a MANAGER so the choice can never be rejected', () => {
    authMock.user = { role: 'MANAGER' };
    openAdd();
    expect(roleOptions()).not.toContain(Role.ADMIN);
    expect(roleOptions()).toContain(Role.DRIVER);
  });

  it('hides ADMIN from an ACCOUNTANT too', () => {
    authMock.user = { role: 'ACCOUNTANT' };
    openAdd();
    expect(roleOptions()).not.toContain(Role.ADMIN);
  });
});
