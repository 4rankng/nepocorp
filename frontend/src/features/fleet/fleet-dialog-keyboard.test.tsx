import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TruckFormModal } from './TruckFormModal';
import { TrailerFormModal } from './TrailerFormModal';
import { DriverFormModal } from './DriverFormModal';

vi.mock('../../hooks/useAnimatedOverlay', () => ({
  useAnimatedOverlay: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => ({ visible: isOpen, handleClose: onClose }),
}));

describe('fleet create dialog keyboard cancellation', () => {
  it.each(['truck', 'trailer', 'driver'])('restores the %s opening button after Escape without saving', (kind) => {
    const save = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      const props = { isOpen: open, saving: false, onsave: save, oncancel: () => setOpen(false) };
      return <>
        <button onClick={() => setOpen(true)}>Mở</button>
        {kind === 'truck' ? <TruckFormModal {...props} trailers={[]} /> : kind === 'trailer' ? <TrailerFormModal {...props} /> : <DriverFormModal {...props} trucks={[]} />}
      </>;
    }
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Mở' });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(save).not.toHaveBeenCalled();
  });
});
