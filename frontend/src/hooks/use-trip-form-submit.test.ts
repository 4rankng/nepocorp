import { act, renderHook, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FuelMode, LoadingType } from '@tingting/shared';
import { api, ApiError } from '../lib/api';
import { saveTripFiguresOnce, useTripFormSubmit } from './use-trip-form-submit';
import { useTripFormState, type UseTripFormStateReturn } from './useTripFormState';
import type { FormLeg } from './useTripFormLegs';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => mocks }));
vi.mock('../components/shared/Toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

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

describe('create trip recovery', () => {
  const validLegs: FormLeg[] = [{ id: 'qa-leg', sequence: 1, origin: 'Hải Phòng', destination: 'Hà Nội', km: '100', loadingType: LoadingType.HANG }];
  const baseState = {
    customerId: '1', routeId: '2', cargoTypeId: '3', plannedContainerTypeId: '4',
    truckId: '5', driverId: '6', trailerType: '40FT', departureDate: '2026-09-22',
    fuelMode: FuelMode.FLAT_RATE, fuelLitersOverride: '50', fuelActualUnitPrice: '25000',
  };
  function setup(initial: { state?: Partial<UseTripFormStateReturn>; legs?: FormLeg[] } = {}) {
    return renderHook(({ state: overrides, legs }) => {
      const state = useTripFormState({ isEditMode: false, existingTrip: undefined });
      const submit = useTripFormSubmit({
        state: { ...state, ...baseState, ...overrides },
        isEditMode: false, existingTrip: undefined, legs: legs ?? validLegs,
        requiredFieldsFilled: 8, hasOptionalData: true, photoUrls: [],
        flushPendingPhotos: async () => [], flushPendingContainerPhotos: async () => new Map(),
      });
      return { ...submit, error: state.error };
    }, { initialProps: initial });
  }
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(api, 'post').mockResolvedValue({ id: 42 });
    vi.spyOn(api, 'put').mockResolvedValue({ items: [] });
  });

  it.each([
    { legs: [{ ...validLegs[0], destination: '' }], state: {} },
    { legs: [{ ...validLegs[0], km: '-1' }], state: {} },
    { legs: validLegs, state: { fuelSupplementLiters: '5', fuelSupplementReason: '' } },
  ])('validates optional data before creating the plan: %j', async (props) => {
    const { result } = setup(props);
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.error).not.toBe('');
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('retries rejected figures on the created ID with corrected data, without another POST', async () => {
    vi.mocked(api.put).mockRejectedValueOnce(new ApiError(400, {}, 'Sai phân bổ dầu'));
    const { result, rerender } = setup();
    await act(async () => { expect(await result.current.handleSubmit()).toBeUndefined(); });
    expect(result.current.createdTripId).toBe(42);
    expect(result.current.error).toContain('Lệnh đã được tạo');
    expect(mocks.invalidateQueries).toHaveBeenCalled();
    rerender({ state: { fuelLitersOverride: '60', fuelActualUnitPrice: '26000' } });
    await act(async () => { expect(await result.current.handleSubmit()).toBe(42); });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith('/trips/42/pre-departure', expect.objectContaining({ fuelLitersOverride: 60, fuelActualUnitPrice: 26000 }));
    expect(api.put).toHaveBeenCalledWith('/trips/42/containers', { containers: [] });
  });

  it('retains the created ID when containers fail after figures have committed', async () => {
    vi.mocked(api.put).mockResolvedValueOnce({}).mockRejectedValueOnce(new ApiError(500, {}, 'Không lưu được container'));
    const { result } = setup();
    await act(async () => { await result.current.handleSubmit(); });
    expect(result.current.createdTripId).toBe(42);
    await act(async () => { expect(await result.current.handleSubmit()).toBe(42); });
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it('rejects changed planning fields with an existing-trip recovery message', async () => {
    vi.mocked(api.put).mockRejectedValueOnce(new ApiError(400, {}, 'Sai phân bổ dầu'));
    const { result, rerender } = setup();
    await act(async () => { await result.current.handleSubmit(); });
    rerender({ state: { customerReference: 'changed reference' } });
    await act(async () => { expect(await result.current.handleSubmit()).toBeUndefined(); });
    expect(result.current.error).toContain('mở chuyến đã tạo để chỉnh sửa');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledTimes(1);
  });

  it('does not send an empty legs list when only figures were entered', async () => {
    const { result } = setup({ legs: [] });
    await act(async () => { expect(await result.current.handleSubmit()).toBe(42); });
    expect(api.put).toHaveBeenCalledWith('/trips/42/pre-departure', expect.objectContaining({ legs: undefined }));
  });

  it('ignores a second submission while creation is in flight', async () => {
    let resolveCreation!: (trip: { id: number }) => void;
    vi.mocked(api.post).mockImplementationOnce(() => new Promise(resolve => { resolveCreation = resolve; }));
    const { result } = setup();
    await act(async () => {
      const first = result.current.handleSubmit();
      expect(await result.current.handleSubmit()).toBeUndefined();
      resolveCreation({ id: 42 });
      expect(await first).toBe(42);
    });
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
