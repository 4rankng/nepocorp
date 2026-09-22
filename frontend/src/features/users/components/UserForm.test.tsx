import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Role } from '@tingting/shared';
import { AddPanel, EditPanel } from './UserForm';
import type { UserRow } from '../utils';

vi.mock('../../../hooks/useAnimatedOverlay', () => ({
  useAnimatedOverlay: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => ({ visible: isOpen, handleClose: onClose }),
}));

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
