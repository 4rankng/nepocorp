import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * The "Loại chi phí" filter must actually drive the list request
 * (kanban 121026230500). QA hit a regression where selecting a type left the
 * rows unfiltered; the query builder alone is pinned by
 * expense-list-query.test.ts, so this pins the missing link — the page's
 * select → state → request wiring — against the real page component.
 *
 * NEPO-24: the toolbar collapses "Xe"/"Loại chi phí" into the "Bộ lọc"
 * popover on mid-size screens (the jsdom fallback), so the select lives
 * inside the popover's dialog and the test drives it open first. The search
 * input replaces the old supplier dropdown and must reach the API as `q`.
 */

const urls: string[] = [];
vi.mock('../lib/api', () => ({
  api: {
    get: (url: string) => {
      urls.push(url);
      return Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20 });
    },
  },
}));
vi.mock('../api/configClient', () => ({
  configClient: {
    getAllSuppliers: () => Promise.resolve([]),
    getAllExpenseCategories: () => Promise.resolve([]),
  },
}));
vi.mock('../hooks/useCatalogs', () => ({
  useCatalogs: () => ({ data: { trucks: [], trailers: [], suppliers: [] } }),
}));
vi.mock('../hooks/useMonth', () => ({
  useMonth: () => ({ month: 10, year: 2026, setMonthYear: () => {} }),
}));
vi.mock('../hooks/animations', () => ({
  usePageAnimations: () => ({ rootRef: { current: null } }),
  useListAnimations: () => {},
}));
vi.mock('../components/shared/Toast', () => ({
  useToast: () => ({ toast: () => {}, showToast: () => {} }),
}));

import ExpenseListPage from './ExpenseListPage';

const renderPage = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ExpenseListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

/** NEPO-24: on the jsdom fallback width the type filter sits in the popover. */
const openOverflowPanel = async () => {
  fireEvent.click(screen.getByRole('button', { name: /^Bộ lọc/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Bộ lọc bổ sung' });
  return within(dialog);
};

afterEach(() => {
  cleanup();
  urls.length = 0;
});

describe('Loại chi phí filter drives the expense list request (kanban 121026230500)', () => {
  it('sends vehicleComponent with the request once a type is picked', async () => {
    renderPage();
    await waitFor(() => expect(urls.length).toBeGreaterThan(0));

    const panel = await openOverflowPanel();
    fireEvent.change(panel.getByLabelText('Loại chi phí'), { target: { value: 'TRAILER' } });
    await waitFor(() => {
      expect(urls.some(u => u.includes('vehicleComponent=TRAILER'))).toBe(true);
    });
  });

  it('maps "Chi phí công ty" to the COMPANY sentinel and clears back to all', async () => {
    renderPage();
    await waitFor(() => expect(urls.length).toBeGreaterThan(0));

    const panel = await openOverflowPanel();
    const select = panel.getByLabelText('Loại chi phí');
    fireEvent.change(select, { target: { value: 'COMPANY' } });
    await waitFor(() => {
      expect(urls.some(u => u.includes('vehicleComponent=COMPANY'))).toBe(true);
    });

    fireEvent.change(select, { target: { value: '' } });
    await waitFor(() => {
      const last = urls[urls.length - 1];
      expect(last).not.toContain('vehicleComponent=');
    });
  });
});

describe('NEPO-24 — "Tìm NCC, mã phiếu" search drives the q param', () => {
  it('sends the debounced search text as q and clears it cleanly', async () => {
    renderPage();
    await waitFor(() => expect(urls.length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText('Tìm NCC, mã phiếu'), { target: { value: 'Sáng Bình' } });
    // Debounced (300ms) — waitFor tolerates the delay.
    await waitFor(() => {
      expect(urls.some(u => u.includes('q=S'))).toBe(true);
    }, { timeout: 2000 });
    expect(urls.some(u => u.includes('q=S%C3%A1ng+B%C3%ACnh'))).toBe(true);

    // Clearing removes the param again.
    fireEvent.change(screen.getByLabelText('Tìm NCC, mã phiếu'), { target: { value: '' } });
    await waitFor(() => {
      const last = urls[urls.length - 1];
      expect(last).not.toContain('q=');
    }, { timeout: 2000 });
  });

  it('no longer renders a standalone supplier dropdown', async () => {
    renderPage();
    await waitFor(() => expect(urls.length).toBeGreaterThan(0));
    // The old "Tất cả NCC" select is gone — its option set lives nowhere now.
    expect(screen.queryByRole('option', { name: 'Tất cả NCC' })).toBeNull();
  });
});
