import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TripStatus, type TripDetail } from '@tingting/shared';
import { TripHeader } from './TripHeader';
import type { TripPermissions } from '../types';

afterEach(cleanup);

describe('TripHeader lock action', () => {
  const permissions: TripPermissions = {
    isManagerOrAdmin: true, canEdit: false, canEditActuals: false,
    canCancel: false, canDispatch: false, canComplete: false, canLock: true,
    canReassign: false, canAdjust: false, canUnlock: false, canChangeDate: false,
    needsPhotos: false, readOnly: false,
  };
  function setup(needsPhotos = false) {
    const onLock = vi.fn();
    render(<TripHeader
      trip={{ id: 42, tripCode: 'QA-42', status: TripStatus.COMPLETED } as TripDetail}
      permissions={{ ...permissions, needsPhotos }} actionLoading={false}
      onBack={vi.fn()} onEdit={vi.fn()} onDispatch={vi.fn()} onComplete={vi.fn()}
      onLock={onLock} onCancel={vi.fn()} onReassign={vi.fn()} onAdjust={vi.fn()} onUnlock={vi.fn()}
    />);
    return onLock;
  }
  it('calls lock without passing the click event into its confirmation payload', () => {
    const onLock = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Khóa chuyến' }));
    expect(onLock).toHaveBeenCalledExactlyOnceWith();
  });
  it('keeps the photo requirement before locking', () => {
    const onLock = setup(true);
    const button = screen.getByRole('button', { name: 'Khóa chuyến' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onLock).not.toHaveBeenCalled();
  });
});
