import type { ReactNode } from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '@tingting/shared';
import { toDriverOption, useTripOptions } from './useTripOptions';

describe('toDriverOption', () => {
  it('preserves the configured base salary used by trip salary auto-fill', () => {
    expect(toDriverOption({
      id: 7,
      name: 'Nguyễn Văn A',
      assignedTruckId: null,
      baseSalary: '12000000',
    })).toEqual({
      id: 7,
      label: 'Nguyễn Văn A',
      baseSalary: 12_000_000,
    });
  });
});

// NEPO-66: /pricing-tables is Casbin-gated to `config:read`; portal roles
// (FORWARDER, DISPATCHER) and DRIVER must skip the fetch instead of eating a
// guaranteed 403 whose retries held the form loading state.
const mocks = vi.hoisted(() => ({
  // vi.hoisted runs before imports execute — the Role enum is not loaded yet,
  // so use the string value (Role is a string enum).
  user: { role: 'MANAGER' } as { role: Role },
  getBootstrap: vi.fn(),
  getPricingTables: vi.fn(),
  listShipments: vi.fn(),
}));
vi.mock('./useAuth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../api/tripClient', () => ({
  tripClient: { getBootstrap: mocks.getBootstrap },
}));
vi.mock('../api/configClient', () => ({
  configClient: { getPricingTables: mocks.getPricingTables },
}));
vi.mock('../api/shipmentClient', () => ({
  shipmentClient: { list: mocks.listShipments },
}));

function bootstrapBlob() {
  return {
    customers: [
      { id: 43, name: 'QA-TEST No Ma KH 1124', shortName: null, contactPerson: null, phone: null, isCarrier: false, linkedSupplierId: null },
      { id: 44, name: 'HTX Chè N Tân', shortName: 'HTX', contactPerson: null, phone: null, isCarrier: true, linkedSupplierId: null },
    ],
    trucks: [],
    drivers: [],
    routes: [],
    cargoTypes: [],
    containerTypes: [],
    trailers: [],
  };
}

function shipmentsPage() {
  return { items: [], total: 0, page: 1, pageSize: 300 };
}

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.user = { role: Role.MANAGER };
  mocks.getBootstrap.mockResolvedValue(bootstrapBlob());
  mocks.getPricingTables.mockResolvedValue([]);
  mocks.listShipments.mockResolvedValue(shipmentsPage());
});
afterEach(() => {
  cleanup();
  client.clear();
  vi.clearAllMocks();
});

describe('useTripOptions pricing-tables gating', () => {
  it('skips the pricing-tables fetch for FORWARDER and still maps bootstrap customers', async () => {
    mocks.user = { role: Role.FORWARDER };

    const { result } = renderHook(() => useTripOptions(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.getPricingTables).not.toHaveBeenCalled();
    expect(result.current.pricingTables).toEqual([]);
    expect(result.current.customers).toEqual([
      { id: 43, label: 'QA-TEST No Ma KH 1124' },
      { id: 44, label: 'HTX Chè N Tân' },
    ]);
  });

  it('skips the pricing-tables fetch for DISPATCHER (no config:read policy)', async () => {
    mocks.user = { role: Role.DISPATCHER };

    const { result } = renderHook(() => useTripOptions(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.getPricingTables).not.toHaveBeenCalled();
  });

  it('still fetches pricing tables for roles with config:read (MANAGER)', async () => {
    const { result } = renderHook(() => useTripOptions(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.getPricingTables).toHaveBeenCalledTimes(1);
  });
});
