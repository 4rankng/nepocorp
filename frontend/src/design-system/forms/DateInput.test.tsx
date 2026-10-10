import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DateInput, isoToDmy, parseDmy } from './DateInput';

describe('isoToDmy / parseDmy', () => {
  it('renders an ISO value as zero-padded DD/MM/YYYY — never MM/DD', () => {
    expect(isoToDmy('2026-10-01')).toBe('01/10/2026');
    expect(isoToDmy('2026-01-31')).toBe('31/01/2026');
    expect(isoToDmy('')).toBe('');
    expect(isoToDmy(null)).toBe('');
    expect(isoToDmy('not-a-date')).toBe('');
  });

  it('accepts the separator and eight-digit shapes a user actually types', () => {
    expect(parseDmy('01/10/2026')).toBe('2026-10-01');
    expect(parseDmy('1/10/2026')).toBe('2026-10-01');
    expect(parseDmy('1-10-2026')).toBe('2026-10-01');
    expect(parseDmy('1.10.2026')).toBe('2026-10-01');
    expect(parseDmy('01102026')).toBe('2026-10-01');
  });

  it('rejects impossible dates instead of rolling them over', () => {
    expect(parseDmy('31/02/2026')).toBeNull();
    expect(parseDmy('00/10/2026')).toBeNull();
    expect(parseDmy('01/13/2026')).toBeNull();
    expect(parseDmy('31/10')).toBeNull();
    expect(parseDmy('')).toBeNull();
  });
});

describe('DateInput', () => {
  it('shows DD/MM/YYYY for its ISO value', () => {
    render(<DateInput label="Từ ngày" value="2026-10-01" onChange={() => {}} />);
    expect((screen.getByLabelText('Từ ngày') as HTMLInputElement).value).toBe('01/10/2026');
  });

  it('emits ISO when a typed date is complete and reverts when it is not', () => {
    const onChange = vi.fn();
    render(<DateInput label="Từ ngày" value="2026-10-01" onChange={onChange} />);
    const field = screen.getByLabelText('Từ ngày');

    fireEvent.change(field, { target: { value: '02/10/2026' } });
    expect(onChange).toHaveBeenCalledWith('2026-10-02');

    onChange.mockClear();
    fireEvent.change(field, { target: { value: '31/02/2026' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(field);
    expect((field as HTMLInputElement).value).toBe('01/10/2026');
  });

  it('refuses dates outside min/max', () => {
    const onChange = vi.fn();
    render(
      <DateInput label="Từ ngày" value="2026-10-01" min="2026-10-01" max="2026-10-31" onChange={onChange} />,
    );
    const field = screen.getByLabelText('Từ ngày');

    fireEvent.change(field, { target: { value: '30/09/2026' } });
    fireEvent.blur(field);
    expect(onChange).not.toHaveBeenCalled();
    expect((field as HTMLInputElement).value).toBe('01/10/2026');

    fireEvent.change(field, { target: { value: '31/10/2026' } });
    expect(onChange).toHaveBeenCalledWith('2026-10-31');
  });

  it('follows external value changes (filter reset / picker)', () => {
    function Harness() {
      const [value, setValue] = useState('2026-10-01');
      return (
        <>
          <DateInput label="Từ ngày" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue('2026-10-15')}>reset</button>
        </>
      );
    }
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'reset' }));
    expect((screen.getByLabelText('Từ ngày') as HTMLInputElement).value).toBe('15/10/2026');
  });
});
