import { useState, type ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

/**
 * Drives AddPanel through a close/reopen cycle the way UsersPage does: a
 * successful save closes the panel, and the same panel is then reopened.
 */
function AddHarness({ onSave }: { onSave: ComponentProps<typeof AddPanel>['onSave'] }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>mở lại</button>
      <AddPanel isOpen={open} saving={false} error={null} truckList={[]} onClose={() => setOpen(false)} onSave={onSave} />
    </>
  );
}

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

/**
 * A browser puts its suggested password straight into the box, without firing
 * React's onChange: the value is on screen but never reaches the form state, so
 * submitting was answered with "fill in the password" for a field the operator
 * could see was filled (kanban 101026095000). The field is uncontrolled and read
 * at submit, so what is on screen is what the API receives.
 */
describe('a password that exists only in the DOM', () => {
  const roleSelect = () => screen.getAllByRole('combobox').find(el =>
    Array.from(el.querySelectorAll('option')).some(o => o.value === Role.DRIVER))!;

  it('is submitted as typed, without a React change event', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'qa.dom.pw' } });
    const password = screen.getByLabelText('Mật khẩu *') as HTMLInputElement;
    password.value = 'S7q3Q5Q9';

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).toMatchObject({ username: 'qa.dom.pw', password: 'S7q3Q5Q9' });
    expect(screen.queryByText('Chưa nhập mật khẩu')).toBeNull();
  });

  it('generates a random password on button click and submits it', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'qa.gen.pw' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo mật khẩu ngẫu nhiên' }));
    const password = screen.getByLabelText('Mật khẩu *') as HTMLInputElement;
    expect(password.value.length).toBeGreaterThanOrEqual(6);

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].password).toBe(password.value);
  });

  it('keeps the box value across show/hide and submits that value', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'qa.toggle.pw' } });
    (screen.getByLabelText('Mật khẩu *') as HTMLInputElement).value = 'S7q3Q5Q9';

    fireEvent.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));
    const shown = screen.getByLabelText('Mật khẩu *') as HTMLInputElement;
    expect(shown.type).toBe('text');
    expect(shown.value).toBe('S7q3Q5Q9');

    fireEvent.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));
    const hidden = screen.getByLabelText('Mật khẩu *') as HTMLInputElement;
    expect(hidden.type).toBe('password');
    expect(hidden.value).toBe('S7q3Q5Q9');

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].password).toBe('S7q3Q5Q9');
  });

  it('clears the password box and its validation when the panel is reopened', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddHarness onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'qa.reopen.pw' } });
    (screen.getByLabelText('Mật khẩu *') as HTMLInputElement).value = 'ReUsed99';

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());

    // The save resolved true, so the panel closed; open it again.
    fireEvent.click(screen.getByRole('button', { name: 'mở lại' }));
    const box = (await screen.findByLabelText('Mật khẩu *')) as HTMLInputElement;
    expect(box.value).toBe('');
    expect(screen.queryByText('Mật khẩu phải có tối thiểu 6 ký tự')).toBeNull();
    expect(box.hasAttribute('aria-invalid')).toBe(false);
  });

  it('never submits a browser-autofilled value in the controlled identity fields', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'qa@example.test' } });
    // Autofill into controlled fields: DOM value with no React event.
    (screen.getByLabelText('Username') as HTMLInputElement).value = 'admin@example.test';
    (screen.getByLabelText('Mật khẩu *') as HTMLInputElement).value = 'S7q3Q5Q9';

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].username).toBe('');
    expect(onSave.mock.calls[0][0].email).toBe('qa@example.test');
  });

  it('refuses to submit a non-empty password below the minimum length', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'qa.short.pw' } });
    (screen.getByLabelText('Mật khẩu *') as HTMLInputElement).value = 'abc';

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(await screen.findByText('Mật khẩu phải có tối thiểu 6 ký tự')).toBeTruthy();
  });

  it('forwards an empty password so the create gate can name the missing field', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    render(<AddPanel isOpen saving={false} error={null} truckList={[]} onClose={vi.fn()} onSave={onSave} />);

    fireEvent.change(roleSelect(), { target: { value: Role.ACCOUNTANT } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'qa.empty.pw' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].password).toBe('');
  });
});
