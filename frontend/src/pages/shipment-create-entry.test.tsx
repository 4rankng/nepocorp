/**
 * NEPO-61 QA unblock — the Lô hàng create entry point must exist and respect
 * the write-role gate. QA (Muse round 23/11) reported "demo không có nút tạo
 * lô": ShipmentFormModal shipped unmounted, so NO role had a create path.
 * The button lives on the list header for SHIPMENT_WRITE_ROLES and opens the
 * shared modal; read roles (kế toán, driver) see no button at all — the
 * backend 403s them on POST /shipments.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/shared/Toast';
import { Role } from '@tingting/shared';
import type { Shipment } from '@tingting/shared';

let currentRole: Role | null = Role.ADMIN;

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: currentRole ? { id: 1, username: 'qa', role: currentRole } : null }),
}));

vi.mock('../hooks/useShipmentQueries', () => ({
  useShipments: () => ({ data: { items: [row()], total: 1 }, isLoading: false, error: null }),
  useCreateShipment: () => dummyMutation(),
  useUpdateShipment: () => dummyMutation(),
}));

vi.mock('../hooks/useTripOptions', () => ({
  useTripOptions: () => ({
    customers: [{ id: 42, label: 'HTX Chè N Tân' }],
    loading: false,
  }),
}));

function dummyMutation() {
  return {
    mutateAsync: async () => { throw new Error('not exercised'); },
    isPending: false,
  };
}

function row(): Shipment {
  return {
    id: 4,
    shipmentCode: 'CNT26004',
    customerId: 42,
    customerName: 'HTX Chè N Tân',
    customerShortName: 'CNT',
    flowType: 'XUAT',
    shippingLine: 'MSC',
    bookingNo: 'MSCU-939901',
    blNo: 'MSCU-939902',
    vesselVoyage: null,
    pol: 'Hai Phong',
    pod: 'Singapore',
    etd: '2026-11-20',
    eta: '2026-11-25',
    cutoffDate: '2026-11-19',
    containerSeals: null,
    customsDeclarationNo: null,
    customsDeclarationDate: null,
    notes: null,
    createdAt: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
    deletedAt: null,
  } as Shipment;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/shipments']}>
          <ShipmentListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

import ShipmentListPage from './ShipmentListPage';

describe('shipment list — Tạo lô hàng entry point', () => {
  beforeEach(() => { currentRole = Role.ADMIN; });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('ADMIN sees the create button; clicking opens the shipment form modal', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: /Tạo lô hàng/i });
    fireEvent.click(btn);
    expect(screen.getByText('Thêm lô hàng')).toBeTruthy();
  });

  it('read roles (ACCOUNTANT, DRIVER) get no create button', () => {
    currentRole = Role.ACCOUNTANT;
    renderPage();
    expect(screen.queryByRole('button', { name: /Tạo lô hàng/i })).toBeNull();
    cleanup();
    currentRole = Role.DRIVER;
    renderPage();
    expect(screen.queryByRole('button', { name: /Tạo lô hàng/i })).toBeNull();
  });
});
