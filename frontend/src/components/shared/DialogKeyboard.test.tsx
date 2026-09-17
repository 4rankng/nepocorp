import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer, Modal } from '../UI';
import { ConfirmDialog } from '../confirm-dialog';
import { ProfileModal } from '../layout/ProfileModal';
import { PasswordModal } from '../layout/PasswordModal';

// Exercise real dialog keyboard behavior without waiting on decorative motion.
vi.mock('../../hooks/useAnimatedOverlay', () => ({
  useAnimatedOverlay: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => ({ visible: isOpen, handleClose: onClose }),
}));

describe('shared dialog keyboard behavior', () => {
  it.each([Modal, Drawer])('labels the dialog, traps Tab, and restores its trigger', (Dialog) => {
    function Example() {
      const [open, setOpen] = useState(false);
      return <>
        <button onClick={() => setOpen(true)}>Mở</button>
        <Dialog isOpen={open} title="Thông tin" onClose={() => setOpen(false)} footer={<button>Lưu</button>}>
          <input aria-label="Ghi chú" />
        </Dialog>
      </>;
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Mở' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Thông tin' });
    const close = within(dialog).getByRole('button', { name: 'Đóng' });
    const save = within(dialog).getByRole('button', { name: 'Lưu' });
    expect(document.activeElement).toBe(close);
    expect(close.closest('.d-tooltip')?.classList.contains('d-tooltip-bottom')).toBe(true);

    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);
    fireEvent.keyDown(save, { key: 'Tab' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('does not save when a child control consumes Enter', () => {
    const save = vi.fn();
    render(<Modal isOpen title="Sửa" onClose={() => {}} onConfirm={save}>
      <input aria-label="Tìm tuyến" onKeyDown={(event) => event.preventDefault()} />
    </Modal>);

    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    expect(save).not.toHaveBeenCalled();
  });

  it('only dismisses the topmost dialog with Escape', () => {
    const closeParent = vi.fn();
    const closeChild = vi.fn();
    render(<>
      <Modal isOpen title="Sửa" onClose={closeParent}><input aria-label="Tên" /></Modal>
      <ConfirmDialog isOpen message="Bỏ thay đổi?" onConfirm={() => {}} onCancel={closeChild} />
    </>);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Hủy' }), { key: 'Escape' });

    expect(closeChild).toHaveBeenCalledOnce();
    expect(closeParent).not.toHaveBeenCalled();
  });

  it('keeps Cancel safe and does not double-confirm focused buttons', () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    render(<ConfirmDialog isOpen message="Xóa bản ghi?" onConfirm={confirm} onCancel={cancel} />);
    const cancelButton = screen.getByRole('button', { name: 'Hủy' });
    expect(document.activeElement).toBe(cancelButton);
    fireEvent.keyDown(cancelButton, { key: 'Enter' });
    // fireEvent does not synthesize a browser's native Enter -> click.
    fireEvent.click(cancelButton);
    expect(cancel).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();

    const confirmButton = screen.getByRole('button', { name: 'Xác nhận' });
    confirmButton.focus();
    fireEvent.keyDown(confirmButton, { key: 'Enter' });
    fireEvent.click(confirmButton);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('associates account labels with the actual wrapped inputs', () => {
    const { unmount } = render(<ProfileModal isOpen onClose={() => {}} saving={false} error={null}
      form={{ username: '', fullName: '', email: '', phone: '' }} onFormChange={() => {}} onSave={() => {}} />);
    for (const label of ['Tên đăng nhập', 'Họ và tên', 'Email', 'Số điện thoại']) {
      expect(screen.getByLabelText(label).tagName).toBe('INPUT');
    }
    unmount();
    render(<PasswordModal isOpen onClose={() => {}} saving={false} error={null}
      form={{ currentPassword: '', newPassword: '', confirmPassword: '' }} onFormChange={() => {}} onSave={() => {}} />);
    for (const label of ['Mật khẩu hiện tại', 'Mật khẩu mới', 'Xác nhận mật khẩu mới']) {
      expect(screen.getByLabelText(label).tagName).toBe('INPUT');
    }
  });
});
