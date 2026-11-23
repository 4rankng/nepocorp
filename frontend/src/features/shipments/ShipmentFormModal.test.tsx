/**
 * Thêm lô hàng dialog layout — QA report: dialog quá hẹp, mọi trường xếp một
 * cột nên thân dialog phải cuộn. Contract: dialog mở rộng 960px và form dùng
 * lưới 2 cột (grid CSS co-located trong ShipmentFormModal.css), để toàn bộ
 * form vừa viewport laptop 1440px không cần cuộn nội bộ.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../../components/shared/Toast';
import ShipmentFormModal from './ShipmentFormModal';

vi.mock('../../hooks/useTripOptions', () => ({
  useTripOptions: () => ({ customers: [], loading: false }),
}));

vi.mock('../../hooks/useShipmentQueries', () => ({
  useCreateShipment: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useUpdateShipment: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

afterEach(cleanup);

describe('ShipmentFormModal layout', () => {
  it('opens wide (960px) so the 2-column grid fits without scrolling', () => {
    render(
      <ToastProvider>
        <ShipmentFormModal isOpen onClose={vi.fn()} />
      </ToastProvider>,
    );
    expect(screen.getByText('Thêm lô hàng')).toBeTruthy();
    const dialog = document.querySelector('.modal__content') as HTMLElement | null;
    expect(dialog).toBeTruthy();
    expect(dialog!.style.getPropertyValue('--modal-max-w')).toBe('960px');
    // Field pairs: customer/flowType, hãng tàu/tàu, booking/BL, POL/POD, tờ khai.
    const grids = document.querySelectorAll('.shipment-form__grid');
    expect(grids.length).toBeGreaterThanOrEqual(5);
  });
});
