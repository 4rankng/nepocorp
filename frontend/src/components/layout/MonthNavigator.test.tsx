import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MonthNavigator } from './Topbar';

const { setMonthYear } = vi.hoisted(() => ({ setMonthYear: vi.fn() }));

vi.mock('../../hooks/useCatalogQueries', () => ({ useSalaryPeriod: () => ({ data: undefined }) }));
vi.mock('../../hooks/useMonth', () => ({
  useMonth: () => ({ month: 9, year: 2026, setMonthYear }),
}));

describe('month picker keyboard focus', () => {
  beforeEach(() => vi.clearAllMocks());

  function openPicker() {
    render(<><MonthNavigator /><button>Nội dung khác</button></>);
    const trigger = screen.getByRole('button', { name: 'Chọn tháng' });
    trigger.focus();
    fireEvent.click(trigger);
    return { trigger, dialog: screen.getByRole('dialog', { name: 'Chọn tháng' }) };
  }

  it('cycles keyboard focus and returns it to the month trigger after Escape', () => {
    const { trigger, dialog } = openPicker();
    const first = within(dialog).getByRole('button', { name: 'Năm trước' });
    const last = within(dialog).getByRole('button', { name: 'Hôm nay' });
    expect(document.activeElement).toBe(first);
    expect(dialog.getAttribute('aria-modal')).toBeNull();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('selects the displayed year and restores the trigger after choosing a month', () => {
    const { trigger, dialog } = openPicker();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Năm sau' }));
    fireEvent.click(within(dialog).getByRole('button', { name: /^T10\s*Tháng 10$/ }));
    expect(setMonthYear).toHaveBeenCalledWith(10, 2027);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('dismisses on an outside click without taking focus from the clicked control', () => {
    openPicker();
    const outside = screen.getByRole('button', { name: 'Nội dung khác' });
    outside.focus();
    fireEvent.mouseDown(outside);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(outside);
  });
});
