import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TextField } from './TextField';
import { TextAreaField } from './TextAreaField';

describe('field feedback', () => {
  it.each([TextField, TextAreaField])('connects validation feedback and retains caller descriptions', (Field) => {
    const { rerender } = render(<Field label="Ghi chú" error="Vui lòng nhập thông tin" aria-describedby="context" />);
    const input = screen.getByRole('textbox', { name: 'Ghi chú' });
    const message = screen.getByText('Vui lòng nhập thông tin');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')?.split(' ')).toEqual(['context', message.id]);

    rerender(<Field label="Ghi chú" helpText="Thông tin thêm" aria-describedby="context" />);
    expect(input.hasAttribute('aria-invalid')).toBe(false);
    expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(screen.getByText('Thông tin thêm').id);
  });
});
