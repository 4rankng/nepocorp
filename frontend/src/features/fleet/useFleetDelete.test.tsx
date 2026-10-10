import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFleetDelete } from './useFleetDelete';

// The fleet cards render inside the anime.js overlay machinery; the dialog
// mounting is what matters here, so the entrance/exit animation is stubbed the
// same way the neighbouring fleet dialog test does.
vi.mock('../../hooks/useAnimatedOverlay', () => ({
  useAnimatedOverlay: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => ({ visible: isOpen, handleClose: onClose }),
}));

function Harness({ onDelete }: { onDelete: (id: number) => void }) {
  const { requestDelete, confirmDialog } = useFleetDelete(onDelete);
  return (
    <>
      <button onClick={() => void requestDelete(7, 'xe đầu kéo 15C-136.31')}>Mở</button>
      {confirmDialog}
    </>
  );
}

describe('useFleetDelete', () => {
  afterEach(cleanup);

  it('names the entity and deletes nothing when the confirmation is cancelled', async () => {
    const onDelete = vi.fn();
    render(<Harness onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở' }));

    const dialog = screen.getByRole('alertdialog');
    expect(dialog.textContent).toContain('Xóa xe đầu kéo 15C-136.31');
    expect(dialog.textContent).toContain('Thao tác không thể hoàn tác');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes exactly the requested row once the confirmation is accepted', async () => {
    const onDelete = vi.fn();
    render(<Harness onDelete={onDelete} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mở' }));
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Xóa' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(7));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
