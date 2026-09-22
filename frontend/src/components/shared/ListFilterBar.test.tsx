import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ListFilterBar } from './ListFilterBar';

afterEach(cleanup);

function Filters() {
  const [value, setValue] = useState('all');
  const [search, setSearch] = useState('');
  return <ListFilterBar label="Trạng thái" options={[{ value: 'all', label: 'Tất cả', count: 4 }, { value: 'active', label: 'Hoạt động', count: 0 }]} value={value} onChange={setValue} search={{ value: search, onChange: setSearch, label: 'Tìm khách hàng' }} />;
}

describe('ListFilterBar', () => {
  it('announces the selected filter and permits selecting a zero-result option', () => {
    render(<Filters />);
    const active = screen.getByRole('button', { name: 'Hoạt động 0' });
    fireEvent.click(active);
    expect(active.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Tất cả 4' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('clears a search and returns focus to the field when its clear action disappears', () => {
    render(<Filters />);
    const search = screen.getByRole('searchbox', { name: 'Tìm khách hàng' });
    fireEvent.change(search, { target: { value: 'Hải Phòng' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    expect((search as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(search);
    expect(screen.queryByRole('button', { name: 'Xóa tìm kiếm' })).toBeNull();
  });
});
