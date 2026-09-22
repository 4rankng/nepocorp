import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import ForwarderTripDetailPage from './ForwarderTripDetailPage';

const mocks = vi.hoisted(() => ({ trip: vi.fn() }));
const mutation = () => ({ mutate: vi.fn(), isPending: false });
vi.mock('../hooks/useQueries', () => ({
  useForwarderTripDetail: mocks.trip,
  useCreateForwarderContainer: () => mutation(),
  useCreateForwarderExpense: () => mutation(),
  useDeleteForwarderExpense: () => mutation(),
}));
vi.mock('../hooks/useForwarderQueries', () => ({
  useUpdateForwarderExpense: () => mutation(),
  useSetForwarderExpenseCompletion: () => mutation(),
}));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: { items: [] } }) }));
vi.mock('../hooks/useCatalogs', () => ({ useCatalogs: () => ({ data: {} }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../hooks/useBackShortcut', () => ({ useBackShortcut: vi.fn() }));
afterEach(cleanup);

it.each([false, true])('identifies unnumbered containers in the expense %s selection and completion group', (multiple) => {
  mocks.trip.mockReturnValue({ data: {
    id: 6, status: 'CREATED', departureDate: '2026-09-22', containers: [
      { id: 7, containerNumber: null, containerTypeName: "20'DC" },
      ...(multiple ? [{ id: 8, containerNumber: 'MSKU1234567', containerTypeName: "40'DC" }] : []),
    ], expenses: [{ id: 1, tripContainerId: 7, expenseType: 'LIFTING', buyAmount: 125000, canEdit: true }], legs: [],
  }, isLoading: false, error: null });
  const view = render(<MemoryRouter><ForwarderTripDetailPage /></MemoryRouter>);
  expect(screen.getByRole('button', { name: "Đánh dấu đã kê xong cho Container 20'DC · Chưa nhập số container" })).toBeTruthy();
  expect(view.container.textContent).not.toContain('Container null');
  fireEvent.click(screen.getAllByRole('button', { name: 'Thêm' })[1]);
  if (multiple) {
    expect(screen.getByRole('option', { name: "20'DC · Chưa nhập số container" })).toHaveProperty('value', '7');
    expect(screen.getByRole('option', { name: 'MSKU1234567' })).toHaveProperty('value', '8');
  } else {
    expect(screen.getByText("20'DC · Chưa nhập số container", { exact: true })).toBeTruthy();
  }
});
