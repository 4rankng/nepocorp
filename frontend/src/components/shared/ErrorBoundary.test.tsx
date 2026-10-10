import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * The app-level boundary relies on exactly this contract: a render error must
 * become a visible, retryable message instead of an unmounted tree. A crash in
 * the shell used to leave a blank page with nothing to click
 * (kanban 101026211510), which is what this pins.
 */

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('shell exploded');
  return <p>nội dung đã hồi phục</p>;
}

describe('ErrorBoundary', () => {
  it('renders the error message and a retry button instead of unmounting', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Đã xảy ra lỗi')).toBeTruthy();
    expect(screen.getByText('shell exploded')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy();
    spy.mockRestore();
  });

  it('retries by clearing the error once the child stops throwing', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary>
        <Boom shouldThrow />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary>
        <Boom shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));

    expect(screen.getByText('nội dung đã hồi phục')).toBeTruthy();
    spy.mockRestore();
  });
});
