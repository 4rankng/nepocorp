import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { LocationAutocomplete } from './LocationAutocomplete';

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('../lib/maps', () => ({ fetchPlaceSuggestions: vi.fn(async () => []) }));

describe('LocationAutocomplete Escape ownership', () => {
  it('lets the page dirty guard run when all location suggestions are closed', () => {
    const back = vi.fn();
    const confirmDiscard = vi.fn(async () => false);
    function Example() {
      useBackShortcut(back, { isDirty: () => true, confirmDiscard });
      return <>
        <LocationAutocomplete value="" onChange={vi.fn()} placeholder="Điểm đi" />
        <LocationAutocomplete value="" onChange={vi.fn()} placeholder="Điểm đến" />
        <button>Thêm cont</button>
      </>;
    }
    render(<Example />);
    const add = screen.getByRole('button', { name: 'Thêm cont' });
    add.focus();
    fireEvent.keyDown(add, { key: 'Escape' });
    expect(confirmDiscard).toHaveBeenCalledOnce();
    expect(back).not.toHaveBeenCalled();
  });
});
