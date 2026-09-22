import { beforeEach, expect, it, vi } from 'vitest';
import { api } from '../api';
import { fetchAllPaginated } from './paginate';
vi.mock('../api', () => ({ api: { get: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('rejects an incomplete catalog when a later page fails', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({ total: 201, items: [1] })
    .mockRejectedValueOnce(new Error('page 2 offline')).mockResolvedValueOnce({ items: [3] });
  await expect(fetchAllPaginated('/customers')).rejects.toThrow('page 2 offline');
});
it('preserves page order while fetching remaining pages concurrently', async () => {
  vi.mocked(api.get).mockImplementation(async (url) => {
    const page = Number(new URL(url, 'http://localhost').searchParams.get('page'));
    if (page === 2) await new Promise(resolve => setTimeout(resolve, 10));
    return { total: 201, items: [page] };
  });
  await expect(fetchAllPaginated('/customers')).resolves.toEqual([1, 2, 3]);
  expect(api.get).toHaveBeenCalledTimes(3);
});
