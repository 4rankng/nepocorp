import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ProfitPage from './ProfitPage';

/**
 * The "Xem trước" button in "Quyết toán & Chốt Quỹ" must always answer with the
 * preview for the current selection:
 *
 * - The preview panel hid behind `preview && !distResult`, so after one
 *   "Chốt & phân bổ" the button fetched but rendered nothing until a full page
 *   reload.
 * - The auto-load effect depended on `showToast`, whose identity changes on
 *   every toast add/dismiss app-wide (Toast.tsx memoizes `toast` over the toast
 *   list), so unrelated toast traffic wiped the panel and refetched it.
 * - `handlePreview` had no stale-response guard, so a slow response for a
 *   previous selection overwrote the newest preview with wrong-quarter data.
 */

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  confirm: vi.fn(),
  toastHolder: { current: vi.fn() },
}));

vi.mock('../lib/api', () => ({
  api: { post: (path: string, body: unknown) => mocks.post(path, body) },
}));
vi.mock('../hooks/useQueries', () => ({
  usePnlReport: () => ({ data: { netProfit: 0 }, isLoading: false, error: null }),
  useCapTable: () => ({ data: [], error: null }),
  useDistributionHistory: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock('../hooks/useMonth', () => ({ useMonth: () => ({ month: 11, year: 2026 }) }));
vi.mock('../hooks/animations', () => ({ usePageAnimations: () => ({ rootRef: { current: null } }) }));
vi.mock('../components/useConfirm', () => ({
  useConfirm: () => ({ confirm: mocks.confirm, dialog: null }),
}));
vi.mock('../components/shared/Toast', () => ({
  useToast: () => ({ toast: mocks.toastHolder.current }),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

// Same shape as useDriverQueries.test.tsx: the frontend's TS lib predates
// ES2024, so Promise.withResolvers is untyped here.
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const PREVIEW_URL = '/reports/distribute-profit/preview';

let previewCalls: Array<{ quarter: number; year: number; d: Deferred<unknown> }>;
let distributeCalls: Array<Deferred<unknown>>;

function previewFor(quarter: number, year: number) {
  return {
    quarter,
    year,
    netProfit: 100_000_000,
    tripCount: 5,
    undistributedProfit: 0,
    distributions: [{ partnerName: 'Nguyễn Văn A', percentage: '70', amount: '70000000' }],
    entity: [],
    perTruck: [],
  };
}

function resultFor(quarter: number, year: number) {
  return {
    quarter,
    year,
    netProfit: 100_000_000,
    tripCount: 5,
    distributions: [{ partnerName: 'Nguyễn Văn A', amount: '70000000' }],
  };
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/profit']}>
      <ProfitPage />
    </MemoryRouter>,
  );
}

async function settlePreview(index: number, quarter: number, year: number) {
  await act(async () => {
    previewCalls[index].d.resolve(previewFor(quarter, year));
  });
}

beforeEach(() => {
  previewCalls = [];
  distributeCalls = [];
  mocks.post.mockReset().mockImplementation((path: string, body: { quarter: number; year: number }) => {
    const d = deferred<unknown>();
    if (path === PREVIEW_URL) previewCalls.push({ ...body, d });
    else distributeCalls.push(d);
    return d.promise;
  });
  mocks.confirm.mockReset().mockResolvedValue(true);
  mocks.toastHolder.current = vi.fn();
});

afterEach(cleanup);

describe('ProfitPage quarterly preview', () => {
  it('shows the preview again after a distribution was settled', async () => {
    mount();
    await settlePreview(0, 4, 2026);
    expect(screen.getByText(/Dự kiến phân phối Quý 4 \/ 2026/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Chốt & phân bổ/ }));
    await act(async () => {});
    await act(async () => {
      distributeCalls[0].resolve(resultFor(4, 2026));
    });
    expect(screen.getByText(/Đã phân chia lợi nhuận Quý 4 \/ 2026/)).toBeTruthy();
    expect(screen.queryByText(/Dự kiến phân phối Quý/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Xem trước|Đang tính/ }));
    await settlePreview(1, 4, 2026);
    expect(screen.getByText(/Dự kiến phân phối Quý 4 \/ 2026/)).toBeTruthy();
  });

  it('keeps the preview when unrelated toast traffic replaces the toast identity', async () => {
    const view = mount();
    await settlePreview(0, 4, 2026);
    expect(screen.getByText(/Dự kiến phân phối Quý 4 \/ 2026/)).toBeTruthy();
    expect(previewCalls).toHaveLength(1);

    // Toast.tsx hands out a new `toast` identity whenever any toast appears or
    // leaves the screen; a rerender carrying the new identity must not refetch
    // or wipe the settled preview.
    mocks.toastHolder.current = vi.fn();
    view.rerender(
      <MemoryRouter initialEntries={['/profit']}>
        <ProfitPage />
      </MemoryRouter>,
    );
    await act(async () => {});

    expect(previewCalls).toHaveLength(1);
    expect(screen.getByText(/Dự kiến phân phối Quý 4 \/ 2026/)).toBeTruthy();
  });

  it('drops a stale preview response that lands after a newer selection', async () => {
    mount();
    await settlePreview(0, 4, 2026);

    fireEvent.click(screen.getByRole('button', { name: /Xem trước/ }));
    expect(previewCalls).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Chọn Quý'), { target: { value: '1' } });
    await act(async () => {});
    expect(previewCalls).toHaveLength(3);

    await settlePreview(2, 1, 2026);
    expect(screen.getByText(/Dự kiến phân phối Quý 1 \/ 2026/)).toBeTruthy();

    // The button's slow response for Quý 4 arrives late — it must not win.
    await settlePreview(1, 4, 2026);
    expect(screen.getByText(/Dự kiến phân phối Quý 1 \/ 2026/)).toBeTruthy();
    expect(screen.queryByText(/Dự kiến phân phối Quý 4/)).toBeNull();
  });

  it('replaces a settled result panel with the new selection’s preview', async () => {
    mount();
    await settlePreview(0, 4, 2026);

    fireEvent.click(screen.getByRole('button', { name: /Chốt & phân bổ/ }));
    await act(async () => {});
    await act(async () => {
      distributeCalls[0].resolve(resultFor(4, 2026));
    });
    expect(screen.getByText(/Đã phân chia lợi nhuận Quý 4 \/ 2026/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Năm quyết toán'), { target: { value: '2025' } });
    await settlePreview(1, 4, 2025);

    expect(screen.getByText(/Dự kiến phân phối Quý 4 \/ 2025/)).toBeTruthy();
    expect(screen.queryByText(/Đã phân chia lợi nhuận/)).toBeNull();
  });
});
