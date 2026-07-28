import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api';
import { saveTripFiguresOnce } from './use-trip-form-submit';

describe('saveTripFiguresOnce', () => {
  it('refreshes after a version conflict without retrying the stale payload', async () => {
    const conflict = new ApiError(
      409,
      { error: 'conflict' },
      'Dữ liệu đã bị thay đổi bởi người khác.',
    );
    const save = vi.fn().mockRejectedValue(conflict);
    const refresh = vi.fn().mockResolvedValue(undefined);

    await expect(saveTripFiguresOnce(save, refresh)).rejects.toBe(conflict);
    expect(save).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not refresh for non-conflict failures', async () => {
    const failure = new ApiError(500, {}, 'Không thể lưu dữ liệu.');
    const save = vi.fn().mockRejectedValue(failure);
    const refresh = vi.fn().mockResolvedValue(undefined);

    await expect(saveTripFiguresOnce(save, refresh)).rejects.toBe(failure);
    expect(save).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
