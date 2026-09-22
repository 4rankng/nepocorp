import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ExpensePhotoAside } from './expense-entry-sections';

vi.mock('../design-system/hooks/useToken', () => ({ getToken: () => 'local-test-token' }));
afterEach(cleanup);

it('authenticates receipt thumbnails after an upload or reloading a saved expense', () => {
  render(<ExpensePhotoAside
    photos={[{ id: 1, url: '/api/photos/expense-photos%2F4%2Freceipt.png' }]}
    uploading={false} isEdit submitting={false}
    handleBack={vi.fn()} removePhoto={vi.fn()} handlePhotoUpload={vi.fn()}
  />);
  expect(screen.getByRole('img', { name: 'Ảnh 1' }).getAttribute('src')).toBe(
    '/api/photos/expense-photos%2F4%2Freceipt.png?token=local-test-token',
  );
  expect(screen.getByText('JPG, PNG · tối đa 15MB')).toBeTruthy();
});
