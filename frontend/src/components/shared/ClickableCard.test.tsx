import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { ClickableCard } from './ClickableCard';

function Location() {
  return <output aria-label="Đường dẫn">{useLocation().pathname}</output>;
}

describe('ClickableCard', () => {
  it.each(['Enter', ' '])('opens the card destination with %s', (key) => {
    render(<MemoryRouter>
      <ClickableCard to="/debt/7">Khách hàng</ClickableCard>
      <Location />
    </MemoryRouter>);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Khách hàng' }), { key });

    expect(screen.getByLabelText('Đường dẫn').textContent).toBe('/debt/7');
  });

  it('lets an action cancel navigation for keyboard activation', () => {
    const onClick = vi.fn((event) => event.preventDefault());
    render(<MemoryRouter>
      <ClickableCard to="/debt/7" onClick={onClick}>Khách hàng</ClickableCard>
      <Location />
    </MemoryRouter>);

    fireEvent.keyDown(screen.getByRole('button', { name: 'Khách hàng' }), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByLabelText('Đường dẫn').textContent).toBe('/');
  });

  it('does not activate the card when a nested control is used', () => {
    const onClick = vi.fn();
    const onAction = vi.fn();
    render(<MemoryRouter>
      <ClickableCard to="/debt/7" onClick={onClick}>
        Khách hàng <button onClick={onAction}>Sửa</button>
      </ClickableCard>
      <Location />
    </MemoryRouter>);

    const action = screen.getByRole('button', { name: 'Sửa' });
    fireEvent.keyDown(action, { key: 'Enter' });
    fireEvent.click(action);

    expect(onAction).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Đường dẫn').textContent).toBe('/');
  });
});
