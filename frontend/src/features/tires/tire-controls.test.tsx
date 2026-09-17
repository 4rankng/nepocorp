import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import { useBackShortcut } from '../../hooks/useBackShortcut';
import { PositionPicker, TirePositionsManagerDialog } from './tire-controls';

describe('tire controls keyboard behavior', () => {
  it('closes only the position dropdown on Escape without page navigation', () => {
    const back = vi.fn();
    function Example() {
      useBackShortcut(back);
      return <PositionPicker value="" labels={['Trước trái']} onChange={vi.fn()} onManage={vi.fn()} />;
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Chọn vị trí lốp' });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(back).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(trigger);
  });

  it('traps manager focus and restores its opener on Escape without changes', () => {
    const mutate = vi.fn();
    const back = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      useBackShortcut(back);
      return <ToastProvider>
        <button onClick={() => setOpen(true)}>Mở vị trí</button>
        {open && <TirePositionsManagerDialog positions={[]} saving={false} oncreate={mutate} onupdate={mutate} ondelete={mutate} oncancel={() => setOpen(false)} />}
      </ToastProvider>;
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Mở vị trí' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Vị trí lắp' });
    const close = within(dialog).getByRole('button', { name: 'Đóng' });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByLabelText('Tên vị trí'));
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(mutate).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
  });
});
