import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * The "Loại chi phí" filter must actually drive the list request
 * (kanban 121026230500). QA hit a regression where selecting a type left the
 * rows unfiltered; the query builder alone is pinned by
 * expense-list-query.test.ts, so this pins the missing link — the page's
 * select → state → request wiring — against the real page component.
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

afterEach(() => {
  cleanup();
  urls.length = 0;
});

describe('Loại chi phí filter drives the expense list request (kanban 121026230500)', () => {
  it('sends vehicleComponent with the request once a type is picked', async () => {
    renderPage();
    await waitFor(() => expect(urls.length).toBeGreaterThan(0));

    fireEvent.change(screen.getByLabelText('Loại chi phí'), { target: { value: 'TRAILER' } });
    await waitFor(() => {
      expect(urls.some(u => u.includes('vehicleComponent=TRAILER'))).toBe(true);
    });
  });

  it('maps "Chi phí công ty" to the COMPANY sentinel and clears back to all', async () => {
    renderPage();
    await waitFor(() => expect(urls.length).toBeGreaterThan(0));

    const select = screen.getByLabelText('Loại chi phí');
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
