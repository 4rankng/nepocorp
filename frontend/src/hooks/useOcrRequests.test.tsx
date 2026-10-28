// NEPO-34 — the hook's network contract: the screen's filters become the
// query-string of GET /api/admin/ocr-requests, and the page becomes
// limit/offset (20 rows per page).
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { useOcrRequests } from './useOcrRequests';

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../lib/api', () => ({ api: { get: mocks.get } }));

const EMPTY = {
  rows: [],
  total: 0,
  limit: 20,
  offset: 0,
  stats: { count: 0, failed: 0, avgDurationMs: null, p95DurationMs: null },
  counts: { all: 0, completed: 0, failed: 0 },
  models: [],
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      {children}
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue(EMPTY);
});

it('maps filters + page to the query string', async () => {
  renderHook(
    () => useOcrRequests(
      {
        status: 'failed',
        model: 'gemini-2.5-flash',
        dateFrom: '2026-10-01',
        dateTo: '2026-10-28',
      },
      3,
    ),
    { wrapper },
  );

  await waitFor(() => expect(mocks.get).toHaveBeenCalled());
  const url = String(mocks.get.mock.calls[0][0]);
  expect(url).toContain('/admin/ocr-requests?');
  expect(url).toContain('limit=20');
  expect(url).toContain('offset=40'); // page 3 → (3-1) × 20
  expect(url).toContain('status=failed');
  expect(url).toContain('model=gemini-2.5-flash');
  expect(url).toContain('dateFrom=2026-10-01');
  expect(url).toContain('dateTo=2026-10-28');
});

it('omits empty filters from the query string', async () => {
  renderHook(() => useOcrRequests({}, 1), { wrapper });

  await waitFor(() => expect(mocks.get).toHaveBeenCalled());
  const url = String(mocks.get.mock.calls[0][0]);
  expect(url).toContain('limit=20');
  expect(url).toContain('offset=0');
  expect(url).not.toContain('status=');
  expect(url).not.toContain('model=');
  expect(url).not.toContain('dateFrom=');
  expect(url).not.toContain('dateTo=');
});
