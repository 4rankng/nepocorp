import {
  demoDrivers, demoTrucks, demoTrailers, demoCustomers, demoRoutes,
  demoCargoTypes, demoPricingTables, demoRoadAllowances, demoFuelConfig,
  demoPenaltyReasons, demoTrips, demoPenalties, demoCapTable,
  demoManagementFees, demoLedgerEntries, demoDashboardStats,
  makePnlReport, demoUsers, demoEarningsSummary, demoDriverPenalties,
  demoDriverTrips, demoDriverTripDetail, demoCustomerStatement,
} from './demo-data';
import { TripStatus } from '@nepocorp/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function paginated<T>(items: T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

function parsePath(path: string) {
  const [pathname, search] = path.split('?');
  const params = new URLSearchParams(search || '');
  return { pathname, params };
}

function filterByStatus<T extends { status: string }>(items: T[], params: URLSearchParams): T[] {
  const status = params.get('status');
  if (!status) return items;
  return items.filter(i => i.status === status);
}

class MockApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    // Small delay to simulate network
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

    const { pathname, params } = parsePath(path);
    const method = (options?.method || 'GET').toUpperCase();
    const body = options?.body ? JSON.parse(options.body as string) : undefined;

    // Route matching
    const result = this.route(method, pathname, params, body);
    return result as T;
  }

  private route(method: string, pathname: string, params: URLSearchParams, body?: any): any {
    // ─── Auth ────────────────────────────────────────────────────────
    if (pathname === '/auth/login') {
      return { token: 'demo-token-123', user: demoUsers.find(u => u.role === body?.identifier) ?? demoUsers[0] };
    }
    if (pathname === '/auth/me') {
      const stored = localStorage.getItem('demo_user');
      if (stored) return JSON.parse(stored);
      return demoUsers[0];
    }
    if (pathname === '/auth/users') {
      if (method === 'POST') return { id: Date.now(), ...body, createdAt: new Date().toISOString() };
      return { items: demoUsers };
    }
    if (pathname.match(/^\/auth\/users\/\d+$/)) {
      const id = parseInt(pathname.split('/').pop()!);
      if (method === 'DELETE') return {};
      return { id, ...body };
    }

    // ─── Drivers ─────────────────────────────────────────────────────
    if (pathname === '/drivers') {
      return { items: demoDrivers, total: demoDrivers.length };
    }
    if (pathname === '/driver/me/trips') {
      return { items: demoDriverTrips };
    }
    if (pathname === '/driver/me/earnings') {
      return demoEarningsSummary;
    }
    if (pathname === '/driver/me/penalties') {
      return { items: demoDriverPenalties };
    }
    if (pathname.match(/^\/driver\/me\/trips\/\d+$/)) {
      const id = parseInt(pathname.split('/').pop()!);
      return demoDriverTripDetail(id);
    }

    // ─── Trucks ──────────────────────────────────────────────────────
    if (pathname === '/trucks') {
      return paginated(demoTrucks, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Trailers ────────────────────────────────────────────────────
    if (pathname === '/trailers') {
      return paginated(demoTrailers, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Customers ───────────────────────────────────────────────────
    if (pathname === '/customers') {
      let items = demoCustomers;
      const search = params.get('search');
      if (search) items = items.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      return paginated(items, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Routes ──────────────────────────────────────────────────────
    if (pathname === '/routes') {
      return paginated(demoRoutes, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Cargo Types ─────────────────────────────────────────────────
    if (pathname === '/cargo-types') {
      return paginated(demoCargoTypes, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Pricing Tables ──────────────────────────────────────────────
    if (pathname === '/pricing-tables') {
      return paginated(demoPricingTables, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Road Allowances ─────────────────────────────────────────────
    if (pathname === '/road-allowances') {
      return paginated(demoRoadAllowances, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Fuel Config ─────────────────────────────────────────────────
    if (pathname === '/fuel-config') {
      return demoFuelConfig;
    }

    // ─── Penalty Reasons ─────────────────────────────────────────────
    if (pathname === '/penalty-reasons') {
      return paginated(demoPenaltyReasons, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Penalties ───────────────────────────────────────────────────
    if (pathname === '/penalties') {
      if (method === 'POST') return { id: Date.now(), ...body };
      return { items: demoPenalties };
    }

    // ─── Cap Table ───────────────────────────────────────────────────
    if (pathname === '/cap-table') {
      return paginated(demoCapTable, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Management Fees ─────────────────────────────────────────────
    if (pathname === '/management-fees') {
      return paginated(demoManagementFees, parseInt(params.get('page') || '1'), parseInt(params.get('pageSize') || '20'));
    }

    // ─── Trips ───────────────────────────────────────────────────────
    if (pathname === '/trips') {
      let items = [...demoTrips];
      const status = params.get('status');
      if (status) items = items.filter(t => t.status === status);
      const limit = parseInt(params.get('limit') || '100');
      return { items: items.slice(0, limit), total: items.length };
    }
    if (pathname.match(/^\/trips\/\d+$/)) {
      const id = parseInt(pathname.split('/').pop()!);
      return demoTrips.find(t => t.id === id) ?? null;
    }
    if (pathname.match(/^\/trips\/\d+\/dispatch$/)) {
      return {};
    }
    if (pathname.match(/^\/trips\/\d+\/lock$/)) {
      return {};
    }
    if (pathname.match(/^\/trips\/\d+\/cancel$/)) {
      return {};
    }
    if (pathname.match(/^\/trips\/\d+\/reassign$/)) {
      return {};
    }
    if (pathname.match(/^\/trips\/\d+\/pre-departure$/)) {
      return {};
    }

    // ─── Reports ─────────────────────────────────────────────────────
    if (pathname === '/reports/dashboard') {
      return demoDashboardStats;
    }
    if (pathname === '/reports/pnl') {
      const month = parseInt(params.get('month') || '5');
      const year = parseInt(params.get('year') || '2025');
      return makePnlReport(month, year);
    }
    if (pathname === '/reports/distribute-profit') {
      return {
        quarter: body?.quarter ?? 1,
        year: body?.year ?? 2025,
        netProfit: 10000000,
        distributions: demoCapTable.map(p => ({ partnerName: p.partnerName, amount: String(Math.round(10000000 * parseFloat(p.percentage) / 100)) })),
      };
    }

    // ─── Ledger ──────────────────────────────────────────────────────
    if (pathname === '/ledger') {
      return { items: demoLedgerEntries, total: demoLedgerEntries.length };
    }
    if (pathname.match(/^\/ledger\/customers\/\d+\/statement$/)) {
      const id = parseInt(pathname.split('/')[3]);
      return demoCustomerStatement(id);
    }

    // ─── Payments ────────────────────────────────────────────────────
    if (pathname === '/payments/receive') {
      return {};
    }

    // ─── Fallback ────────────────────────────────────────────────────
    return { items: [], total: 0 };
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown, opts?: { expectedUpdatedAt?: string }) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }
  put<T>(path: string, body: unknown, opts?: { expectedUpdatedAt?: string }) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new MockApiClient();
