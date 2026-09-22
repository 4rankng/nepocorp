import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBackShortcut } from '../hooks/useBackShortcut';
import { LocationAutocomplete } from './LocationAutocomplete';

const mocks = vi.hoisted(() => ({
  ports: [] as Array<{ id: number; name: string; code: string; city: string }>,
  fetchPlaces: vi.fn(async () => [] as Array<{ placeId: string; description: string }>),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: mocks.ports }) }));
vi.mock('../lib/maps', () => ({ fetchPlaceSuggestions: mocks.fetchPlaces }));
beforeEach(() => { mocks.ports = []; mocks.fetchPlaces.mockReset().mockResolvedValue([]); });

function WithSuggestions() {
  const [value, setValue] = useState('');
  return <><LocationAutocomplete value={value} onChange={setValue} placeholder="Điểm đi" /><input aria-label="Ghi chú" /></>;
}

function addPorts() {
  mocks.ports = [{ id: 1, name: 'Cảng Đình Vũ', code: 'DV', city: 'Hải Phòng' }, { id: 2, name: 'Cảng Lạch Huyện', code: 'LH', city: 'Hải Phòng' }];
}

describe('LocationAutocomplete keyboard interaction', () => {
  it('selects a catalog suggestion with ArrowDown and Enter without submitting the form', () => {
    addPorts();
    const submit = vi.fn(event => event.preventDefault());
    render(<form onSubmit={submit}><WithSuggestions /></form>);
    const input = screen.getByPlaceholderText('Điểm đi');
    input.focus();
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /Cảng Lạch Huyện/ }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((input as HTMLInputElement).value).toBe('Cảng Lạch Huyện');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(submit).not.toHaveBeenCalled();
  });

  it('keeps the field focused while clicking a suggestion', () => {
    addPorts();
    render(<WithSuggestions />);
    const input = screen.getByPlaceholderText('Điểm đi');
    input.focus();
    fireEvent.focus(input);
    const option = screen.getByRole('option', { name: /Cảng Lạch Huyện/ });
    expect(fireEvent.mouseDown(option)).toBe(false);
    fireEvent.click(option);
    expect((input as HTMLInputElement).value).toBe('Cảng Lạch Huyện');
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes when Tab moves focus to another field', () => {
    addPorts();
    render(<WithSuggestions />);
    const input = screen.getByPlaceholderText('Điểm đi');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeTruthy();
    const next = screen.getByRole('textbox', { name: 'Ghi chú' });
    fireEvent.blur(input, { relatedTarget: next });
    next.focus();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(next);
  });

  it('does not reopen a dismissed menu when delayed place results arrive', async () => {
    addPorts();
    let resolve!: (results: Array<{ placeId: string; description: string }>) => void;
    mocks.fetchPlaces.mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<WithSuggestions />);
    const input = screen.getByPlaceholderText('Điểm đi');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'Cảng' } });
    await waitFor(() => expect(mocks.fetchPlaces).toHaveBeenCalled());
    fireEvent.keyDown(input, { key: 'Escape' });
    await act(async () => resolve([{ placeId: 'x', description: 'Cảng mới' }]));
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });
});

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
