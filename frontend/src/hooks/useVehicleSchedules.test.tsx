import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { vehicleScheduleClient } from '../api/vehicleScheduleClient';
import { useAllActiveVehicleSchedules } from './useVehicleSchedules';

vi.mock('../api/vehicleScheduleClient', () => ({
  vehicleScheduleClient: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
  },
}));

describe('useAllActiveVehicleSchedules', () => {
  beforeEach(() => {
    vi.mocked(vehicleScheduleClient.list).mockReset();
  });

  it('loads future active schedules for per-vehicle counts without changing the due banner query', async () => {
    vi.mocked(vehicleScheduleClient.list).mockResolvedValue([]);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useAllActiveVehicleSchedules(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(vehicleScheduleClient.list).toHaveBeenCalledWith({
      history: true,
      status: 'ACTIVE',
    });
  });
});
