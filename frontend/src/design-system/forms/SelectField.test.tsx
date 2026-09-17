import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
const options = <><option value="">Không chọn</option><option value="blocked" disabled>Tạm dừng</option><option value="active">Đang hoạt động</option></>;
async function choose(label: string) {
  fireEvent.click(screen.getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: label }));
}

describe('SelectField shared select', () => {
  it('supports keyboard selection, skips disabled options and restores trigger focus', async () => {
    render(<SelectField label="Trạng thái" defaultValue="">{options}</SelectField>);
    const trigger = screen.getByRole('combobox', { name: 'Trạng thái' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const first = await screen.findByRole('option', { name: 'Không chọn' });
    await waitFor(() => expect(document.activeElement).toBe(first));
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    const active = screen.getByRole('option', { name: 'Đang hoạt động' });
    await waitFor(() => expect(document.activeElement).toBe(active));
    fireEvent.keyDown(active, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(trigger.textContent).toContain('Đang hoạt động');
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('preserves empty values, names and real change events without leaking mapped values into forms', async () => {
    const changes: Array<{ value: string; name: string; label: string }> = [];
    const formChanges = vi.fn();
    const { container } = render(<form onChange={formChanges}>
      <SelectField label="Trạng thái" name="status" defaultValue="active" onChange={event => {
        expect(event.currentTarget).toBeInstanceOf(HTMLSelectElement);
        changes.push({ value: event.target.value, name: event.target.name, label: event.target.selectedOptions[0].label });
      }}>{options}</SelectField>
    </form>);
    const form = container.querySelector('form')!;
    expect(new FormData(form).getAll('status')).toEqual(['active']);
    formChanges.mockClear();
    await choose('Không chọn');
    expect(screen.getByRole('combobox').textContent).toContain('Không chọn');
    expect(new FormData(form).getAll('status')).toEqual(['']);
    expect(changes).toEqual([{ value: '', name: 'status', label: 'Không chọn' }]);
    expect(formChanges).toHaveBeenCalledTimes(1);
  });

  it('follows controlled updates and leaves control with the caller', async () => {
    function Controlled() {
      const [value, setValue] = useState('');
      return <><SelectField label="Trạng thái" value={value} onChange={event => setValue(event.target.value)}>{options}</SelectField><button onClick={() => setValue('')}>Đặt lại</button></>;
    }
    const { rerender } = render(<Controlled />);
    await choose('Đang hoạt động');
    expect(screen.getByRole('combobox').textContent).toContain('Đang hoạt động');
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại' }));
    expect(screen.getByRole('combobox').textContent).toContain('Không chọn');
    const onChange = vi.fn();
    rerender(<SelectField label="Trạng thái" value="" onChange={onChange}>{options}</SelectField>);
    await choose('Đang hoạt động');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('combobox').textContent).toContain('Không chọn');
  });

  it('resets uncontrolled state to its default and supports an external form owner', async () => {
    render(<><form id="edit-form" data-testid="owner" /><SelectField label="Trạng thái" name="status" form="edit-form" defaultValue="active">{options}</SelectField></>);
    const form = screen.getByTestId('owner') as HTMLFormElement;
    await choose('Không chọn');
    expect(new FormData(form).get('status')).toBe('');
    await act(async () => form.reset());
    expect(screen.getByRole('combobox').textContent).toContain('Đang hoạt động');
    expect(new FormData(form).get('status')).toBe('active');
  });

  it('respects canceled form resets', async () => {
    const { container } = render(<form onReset={event => event.preventDefault()}>
      <SelectField label="Trạng thái" name="status" defaultValue="active">{options}</SelectField>
    </form>);
    const form = container.querySelector('form')!;
    await choose('Không chọn');
    await act(async () => form.reset());
    expect(screen.getByRole('combobox').textContent).toContain('Không chọn');
    expect(new FormData(form).get('status')).toBe('');
  });

  it('selects the first enabled option when no default is supplied', () => {
    const { container } = render(<form><SelectField label="Trạng thái" name="status">
      <option value="blocked" disabled>Tạm dừng</option><option value="active">Đang hoạt động</option><option value="">Không chọn</option>
    </SelectField></form>);
    expect(screen.getByRole('combobox').textContent).toContain('Đang hoạt động');
    expect(new FormData(container.querySelector('form')!).get('status')).toBe('active');
  });

  it('connects labels, required validation and error/help text to the visible control', async () => {
    const { rerender, container } = render(<form><SelectField label="Trạng thái" name="status" required helpText="Chọn trạng thái" defaultValue="">{options}</SelectField></form>);
    const trigger = screen.getByRole('combobox', { name: 'Trạng thái' });
    expect(container.querySelector('label')?.htmlFor).toBe(trigger.id);
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(document.getElementById(trigger.getAttribute('aria-describedby')!)?.textContent).toBe('Chọn trạng thái');
    expect(container.querySelector('form')!.checkValidity()).toBe(false);
    expect(document.activeElement).toBe(trigger);
    await choose('Đang hoạt động');
    expect(container.querySelector('form')!.checkValidity()).toBe(true);
    rerender(<form><SelectField label="Trạng thái" required error="Chọn lại trạng thái">{options}</SelectField></form>);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById(trigger.getAttribute('aria-describedby')!)?.textContent).toBe('Chọn lại trạng thái');
  });

  it('maps arbitrary option values without collisions and uses text when value is omitted', async () => {
    const { container } = render(<form><SelectField label="Loại" name="kind" defaultValue="">
      <option value="">Không chọn</option><option value="0">Số không</option><option value="1">Số một</option><option>Văn bản</option>
    </SelectField></form>);
    const form = container.querySelector('form')!;
    for (const [label, value] of [['Số không', '0'], ['Số một', '1'], ['Văn bản', 'Văn bản'], ['Không chọn', '']]) {
      await choose(label);
      expect(new FormData(form).get('kind')).toBe(value);
    }
  });

  it('honors disabled fields and optgroups and dismisses with Escape without changing values', async () => {
    const { rerender, container } = render(<form><SelectField label="Loại" name="kind" disabled defaultValue="a"><option value="a">A</option></SelectField></form>);
    expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(true);
    expect(new FormData(container.querySelector('form')!).has('kind')).toBe(false);
    rerender(<form><SelectField label="Loại" name="kind" defaultValue="a"><option value="a">A</option><optgroup label="Không dùng" disabled><option value="b">B</option></optgroup></SelectField></form>);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    expect(screen.getByRole('option', { name: 'B' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.keyDown(screen.getByRole('option', { name: 'A' }), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(trigger.textContent).toContain('A');
  });

  it('retains native multiple-select semantics', () => {
    const { container } = render(<form><SelectField label="Nhiều loại" name="kinds" multiple defaultValue={['a', 'b']}><option value="a">A</option><option value="b">B</option></SelectField></form>);
    expect(screen.getByRole('listbox', { name: 'Nhiều loại' })).toBeInstanceOf(HTMLSelectElement);
    expect(new FormData(container.querySelector('form')!).getAll('kinds')).toEqual(['a', 'b']);
  });
});
