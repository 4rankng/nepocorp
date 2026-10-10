import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PhotoPlaceholder } from './PhotoPlaceholder';

describe('PhotoPlaceholder', () => {
  it('names the photo and the likely cause in the full grid variant', () => {
    render(<PhotoPlaceholder label="Ảnh 2" />);

    expect(screen.getByText('Ảnh 2')).toBeTruthy();
    expect(screen.getByText('Không tải được ảnh')).toBeTruthy();
    expect(screen.getByText('Ảnh có thể đã bị xoá hoặc không còn trên máy chủ')).toBeTruthy();
  });

  it('keeps the compact thumbnail to a short notice and moves the cause to the tooltip', () => {
    render(<PhotoPlaceholder compact />);

    expect(screen.getByText('Không tải được')).toBeTruthy();
    expect(screen.queryByText('Không tải được ảnh')).toBeNull();
    expect(screen.getByRole('img').getAttribute('title')).toBe('Ảnh có thể đã bị xoá hoặc không còn trên máy chủ');
  });
});
