import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { onboardingEvents } from '../lib/onboardingEvents';

const { getTasks, upsertTask } = vi.hoisted(() => ({
  getTasks: vi.fn(),
  upsertTask: vi.fn(),
}));

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: { userId: 1, role: 'MANAGER' } }),
}));

vi.mock('../context/TourControllerContext', () => ({
  useTourController: () => ({ start: vi.fn() }),
}));

vi.mock('../api/onboardingClient', () => ({
  onboardingClient: { getTasks, upsertTask },
}));

import { useOnboardingChecklist } from './useOnboardingChecklist';

describe('useOnboardingChecklist', () => {
  beforeEach(() => {
    onboardingEvents.clear();
    getTasks.mockResolvedValue([]);
    upsertTask.mockResolvedValue({});
    vi.clearAllMocks();
  });

  it('completes only the checklist task for a finished curated guide', async () => {
    const { result } = renderHook(() => useOnboardingChecklist());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      onboardingEvents.emit('tour.completed', { tourId: 'create-trip' });
    });

    await waitFor(() => expect(result.current.completedCount).toBe(1));
    expect(result.current.tasks.find((task) => task.id === 'manager-create-first-trip')?.taskStatus).toBe('completed');
    expect(result.current.tasks.find((task) => task.id === 'manager-lock-first-trip')?.taskStatus).toBe('pending');
    expect(upsertTask).toHaveBeenCalledWith({ taskId: 'manager-create-first-trip', status: 'completed' });
  });
});
