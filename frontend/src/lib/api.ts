export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API_BASE = '/api';

// The backend now applies a snake_case serializer middleware on every response
// (see backend/src/middleware/serializer.ts), so all keys arrive in snake_case
// (gross_profit, total_revenue, license_plate, …). A lot of legacy frontend
// code still reads the camelCase form (stats.grossProfit, t.licensePlate, …).
// Rather than touching every read site, we mutate the parsed JSON to expose
// a camelCase alias for every snake_case key, so both forms work in the UI.
// This is idempotent — keys without an underscore aren't touched, and we
// only add aliases when the camelCase key isn't already present.
function addCamelCaseAliases(value: any): any {
  if (Array.isArray(value)) {
    for (const item of value) addCamelCaseAliases(item);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const v = (value as any)[key];
      if (v && typeof v === 'object') addCamelCaseAliases(v);
      if (key.includes('_')) {
        const camel = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
        if (camel !== key && !(camel in value)) (value as any)[camel] = v;
      }
    }
  }
  return value;
}

// The backend now applies snakeCaseSerializer middleware, converting all
// camelCase keys to snake_case at the response seam. The frontend consumes
// snake_case directly — no client-side transformation needed.

class ApiClient {
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

  private async request<T>(path: string, options?: RequestInit & { expectedUpdatedAt?: string }): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...(options?.headers as Record<string, string> || {}),
    };
    if (options?.expectedUpdatedAt) {
      headers['If-Unmodified-Since'] = options.expectedUpdatedAt;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Lỗi kết nối' }));
      throw new ApiError(res.status, error.error || 'Lỗi không xác định');
    }
    return addCamelCaseAliases(await res.json()) as T;
  }

  get<T>(path: string) { return this.request<T>(path); }
  post<T>(path: string, body: unknown, opts?: { expectedUpdatedAt?: string }) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body), ...opts });
  }
  put<T>(path: string, body: unknown, opts?: { expectedUpdatedAt?: string }) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body), ...opts });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  delete<T>(path: string) { return this.request<T>(path, { method: 'DELETE' }); }
}

export const api = new ApiClient();
