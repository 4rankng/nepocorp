// NEPO-34 — the "Nhật ký OCR" screen behaviour: caller names (never raw ids),
// the response expand (full value — no truncate), filter → hook wiring and
// paging. The hook is mocked at its boundary; its own URL building is pinned
// in useOcrRequests.test.tsx.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import OcrRequestsPage from './OcrRequestsPage';
import type { OcrRequestListResponse } from '@tingting/shared';

const mocks = vi.hoisted(() => ({ useOcrRequests: vi.fn() }));
vi.mock('../hooks/useOcrRequests', () => ({
  OCR_REQUESTS_PAGE_SIZE: 20,
  useOcrRequests: mocks.useOcrRequests,
}));

const LONG_RESPONSE = JSON.stringify({
  ok: true,
  container: 'CSNU3412879666',
  seal: 'VN8821',
  raw_text: 'CSNU 3412879666 / SEAL VN8821 / dòng dài không bao giờ được cắt cụt',
});

const RESPONSE = {
  rows: [
    {
      id: 5902,
      created_at: '2026-10-28T07:32:07.000Z',
      updated_at: '2026-10-28T07:32:09.410Z',
      duration_ms: 2410,
      model: 'gemini-2.5-flash',
      status: 'completed' as const,
      response: LONG_RESPONSE,
      error_msg: null,
      user_id: 7,
      user_name: 'Lê Văn Tài',
    },
    {
      id: 5900,
      created_at: '2026-10-28T06:57:19.000Z',
      updated_at: '2026-10-28T06:57:27.003Z',
      duration_ms: 8003,
      model: 'gemini-2.0-flash',
      status: 'failed' as const,
      response: null,
      error_msg: '504 Deadline Exceeded — upstream Gemini did not answer within 8000 ms',
      user_id: null,
      user_name: null,
    },
  ],
  total: 45,
  limit: 20,
  offset: 0,
  stats: { count: 45, failed: 3, avgDurationMs: 2410, p95DurationMs: 5980 },
  counts: { all: 45, completed: 42, failed: 3 },
  models: ['gemini-2.0-flash', 'gemini-2.5-flash'],
} satisfies OcrRequestListResponse;

const ready = (data: OcrRequestListResponse) => ({ data, isLoading: false, isFetching: false });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useOcrRequests.mockReturnValue(ready(RESPONSE));
});
afterEach(cleanup);

function renderPage() {
  return render(
    <MemoryRouter>
      <OcrRequestsPage />
    </MemoryRouter>,
  );
}

it('shows the caller name, not the raw user id (No Raw IDs)', () => {
  renderPage();
  // Desktop row + mobile card both carry the name.
  expect(screen.getAllByText('Lê Văn Tài').length).toBe(2);
  expect(screen.getAllByText('Thành công').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Lỗi').length).toBeGreaterThan(0);
});

it('expands the response to its full value and collapses again', () => {
  renderPage();
  const expandButtons = screen.getAllByRole('button', { name: /Phản hồi/ });
  fireEvent.click(expandButtons[0]);

  // The whole stored answer is on screen on BOTH surfaces — nothing cut.
  expect(screen.getAllByText(/CSNU3412879666/).length).toBe(2);
  expect(screen.getAllByText(/dòng dài không bao giờ được cắt cụt/).length).toBe(2);

  fireEvent.click(screen.getAllByRole('button', { name: /Phản hồi/ })[0]);
  expect(screen.queryAllByText(/CSNU3412879666/).length).toBe(0);
});

it('shows the failure reason in the expanded panel of a failed row', () => {
  renderPage();
  const failedRowButton = screen.getAllByRole('button', { name: /Phản hồi/ })[1];
  fireEvent.click(failedRowButton);
  expect(screen.getAllByText(/504 Deadline Exceeded/).length).toBe(2);
});

it('passes status/model/date filters to the hook and resets paging', () => {
  renderPage();
  const lastCall = () => mocks.useOcrRequests.mock.calls.at(-1)!;
  expect(lastCall()[1]).toBe(1);

  fireEvent.click(screen.getByRole('button', { name: /Lỗi 3/ }));
  expect(lastCall()[0]).toMatchObject({ status: 'failed' });
  expect(lastCall()[1]).toBe(1);

  fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'gemini-2.0-flash' } });
  expect(lastCall()[0]).toMatchObject({ status: 'failed', model: 'gemini-2.0-flash' });

  fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-10-28' } });
  expect(lastCall()[0]).toMatchObject({
    status: 'failed',
    model: 'gemini-2.0-flash',
    dateFrom: '2026-10-01',
    dateTo: '2026-10-28',
  });
  expect(lastCall()[1]).toBe(1);
});

it('pages forward and back with Trước/Sau', () => {
  renderPage();
  const lastCall = () => mocks.useOcrRequests.mock.calls.at(-1)!;

  fireEvent.click(screen.getByRole('button', { name: /Sau/ }));
  expect(lastCall()[1]).toBe(2);

  fireEvent.click(screen.getByRole('button', { name: /Trước/ }));
  expect(lastCall()[1]).toBe(1);
});

it('Đặt lại clears every filter', () => {
  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /Lỗi 3/ }));
  fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'gemini-2.0-flash' } });

  fireEvent.click(screen.getByRole('button', { name: 'Đặt lại' }));
  const [filters, page] = mocks.useOcrRequests.mock.calls.at(-1)!;
  expect(filters).toMatchObject({ status: undefined, model: undefined, dateFrom: undefined, dateTo: undefined });
  expect(page).toBe(1);
});

it('renders both surfaces: desktop table and mobile cards', () => {
  const { container } = renderPage();
  expect(container.querySelector('.ocrlog-desktop .ocrlog-table')).toBeTruthy();
  expect(container.querySelectorAll('.ocrlog-mobile .ocrlog-card').length).toBe(2);
  // The table body and the card list carry the same two requests.
  const table = container.querySelector('.ocrlog-table')!;
  expect(within(table as HTMLElement).getAllByText('gemini-2.5-flash').length).toBe(1);
});
