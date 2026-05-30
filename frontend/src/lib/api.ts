export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API_BASE = '/api';

// The backend returns objects in camelCase (licensePlate, assignedTruckId,
// departureDate, …) but most of the frontend was written against snake_case
// fields (license_plate, assigned_truck_id, departure_date, …). The mismatch
// was rendering plate-tag pills with no plate text on /fleet (only "VN" / "RM"
// visible) and similar holes elsewhere.
//
// Rather than rewriting every component, normalize responses once at the API
// boundary: for every camelCase key, also expose a snake_case alias on the
// same object. New code can use either form, legacy code keeps working.
function addSnakeCaseAliases(value: any): any {
  if (Array.isArray(value)) {
    for (const item of value) addSnakeCaseAliases(item);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const v = (value as any)[key];
      if (v && typeof v === 'object') addSnakeCaseAliases(v);
      // Convert camelCase → snake_case alias (idempotent).
      if (/[a-z][A-Z]/.test(key)) {
        const snake = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        if (!(snake in value)) (value as any)[snake] = v;
      }
    }
  }
  return value;
}

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
    const data = await res.json();
    return addSnakeCaseAliases(data);
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
