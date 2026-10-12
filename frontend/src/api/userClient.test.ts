/**
 * The Excel export resolves the whole filtered set from the server's own count,
 * paging past the list endpoint's 100-row cap — it must never size itself from
 * the on-screen total (a render snapshot that moves across refetches) or stop
 * early (kanban 101026003230).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../lib/api';
import { userClient } from './userClient';

vi.mock('../lib/api', () => ({ api: { get: vi.fn() } }));

const pageOf = (n: number, ids: number[], total: number) => ({
  items: ids.map(id => ({ id })),
  total,
  page: n,
  pageSize: 100,
  counts: { total, staff: 0, driver: 0, inactive: 0 },
});

afterEach(() => vi.resetAllMocks());

describe('getUsersAll', () => {
  it('collects every row across pages using the server count', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(pageOf(1, [1, 2], 3))
      .mockResolvedValueOnce(pageOf(2, [3], 3));

    const all = await userClient.getUsersAll({ filter: 'all' });

    expect(all.total).toBe(3);
    expect(all.items.map(u => u.id)).toEqual([1, 2, 3]);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('makes one request when the first page already holds the full set', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(pageOf(1, [1], 1));

    const all = await userClient.getUsersAll();

    expect(all.items.map(u => u.id)).toEqual([1]);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('stops when the server returns nothing further, even if the count is off', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(pageOf(1, [1], 5))
      .mockResolvedValueOnce(pageOf(2, [], 5));

    const all = await userClient.getUsersAll({ search: 'x' });

    expect(all.items.map(u => u.id)).toEqual([1]);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
