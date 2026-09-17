import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ActionBar } from './ActionBar';

const form = vi.hoisted(() => ({ requiredFieldsFilled: 0, totalRequiredFields: 5, submitting: false, uploading: {}, error: '' }));
vi.mock('../../hooks/useTripFormContext', () => ({ useTripFormContext: () => form }));

describe('trip create footer', () => {
  it('groups the short action labels separately from the completeness message', () => {
    render(<ActionBar onCancel={vi.fn()} onSubmit={vi.fn()} />);
    const create = screen.getByRole('button', { name: 'Tạo lệnh' });
    const cancel = screen.getByRole('button', { name: 'Hủy' });
    expect(create.parentElement).toBe(cancel.parentElement);
    expect(create.parentElement?.classList.contains('tc-action-bar__actions')).toBe(true);
    expect(create.parentElement?.contains(screen.getByText('Còn 5 trường bắt buộc chưa điền'))).toBe(false);
    expect((create as HTMLButtonElement).disabled).toBe(true);
  });
});
