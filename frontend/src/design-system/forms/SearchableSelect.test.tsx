import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchableSelect } from './SearchableSelect';

const ROUTES = [
  { value: '1', label: 'Hải Phòng - Yên Sơn, Tuyên Quang' },
  { value: '2', label: 'Hải Phòng - Bản Bo, Lai Châu' },
  { value: '3', label: 'Nam Đình Vũ - Cẩm Khê, Phú Thọ' },
];

describe('SearchableSelect', () => {
  it('filters Vietnamese labels without requiring diacritics', () => {
    render(
      <SearchableSelect
        id="routeId"
        value=""
        onChange={() => {}}
        options={ROUTES}
        searchPlaceholder="Tìm tuyến đường…"
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'hai phong yen son' },
    });

    expect(screen.getByRole('option', { name: /Hải Phòng - Yên Sơn/ })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Bản Bo/ })).toBeNull();
  });

  it('selects a filtered route and shows it in the trigger', () => {
    function ControlledSelect() {
      const [value, setValue] = useState('');
      return (
        <SearchableSelect
          id="routeId"
          value={value}
          onChange={setValue}
          options={ROUTES}
          searchPlaceholder="Tìm tuyến đường…"
        />
      );
    }

    render(<ControlledSelect />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'ban bo' },
    });
    fireEvent.click(screen.getByRole('option', { name: /Bản Bo/ }));

    expect(screen.getByRole('button').textContent).toContain('Hải Phòng - Bản Bo, Lai Châu');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('leads the list with the suggestion group and drops it once a search starts', () => {
    render(
      <SearchableSelect
        id="route"
        value=""
        onChange={() => {}}
        options={ROUTES}
        suggestedOptions={[ROUTES[2]]}
        suggestedLabel="Chọn nhanh"
      />,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Chọn nhanh')).toBeTruthy();
    const options = screen.getAllByRole('option').map((element) => element.textContent);
    // The suggestion is the first row and is not duplicated in the full list.
    expect(options[0]).toContain('Nam Đình Vũ');
    expect(options).toHaveLength(ROUTES.length);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ban bo' } });

    expect(screen.queryByText('Chọn nhanh')).toBeNull();
    expect(screen.getAllByRole('option')).toHaveLength(1);
  });

  it('supports arrow-key and Enter selection', () => {
    const onChange = vi.fn();
    render(
      <SearchableSelect
        id="routeId"
        value=""
        onChange={onChange}
        options={ROUTES}
        searchPlaceholder="Tìm tuyến đường…"
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    const search = screen.getByRole('combobox');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith('2');
  });

  it.each(['Enter', 'Escape'])('returns focus to the trigger after %s', async (key) => {
    render(<SearchableSelect id="routeId" value="" onChange={() => {}} options={ROUTES} />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    fireEvent.click(trigger);
    const search = screen.getByRole('combobox');
    await waitFor(() => expect(document.activeElement).toBe(search));

    fireEvent.keyDown(search, { key });

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when focus leaves the control without stealing the next field focus', () => {
    render(<>
      <SearchableSelect id="routeId" value="" onChange={() => {}} options={ROUTES} />
      <input aria-label="Ghi chú" />
    </>);
    fireEvent.click(screen.getByRole('button'));
    const search = screen.getByRole('combobox');
    const next = screen.getByRole('textbox', { name: 'Ghi chú' });
    fireEvent.blur(search, { relatedTarget: next });
    next.focus();

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(document.activeElement).toBe(next);
  });

  it('does not propagate option selection or dismissal to a parent form shortcut', () => {
    const onKeyDown = vi.fn();
    render(<div onKeyDown={onKeyDown}>
      <SearchableSelect id="routeId" value="" onChange={() => {}} options={ROUTES} />
    </div>);
    for (const key of ['Enter', 'Escape']) {
      fireEvent.click(screen.getByRole('button'));
      fireEvent.keyDown(screen.getByRole('combobox'), { key });
    }

    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
