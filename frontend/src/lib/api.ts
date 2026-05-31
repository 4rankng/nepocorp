export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const API_BASE = '/api';

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
      // Server may return error as a string OR a ZodError array of
      // `{ path, message, code }` objects. Stringifying an array via the
      // ApiError constructor produced "[object Object]" in toast messages.
      // Coerce arrays / objects to a readable string before throwing.
      const raw = error.error ?? error.detail ?? error.message;
      let msg: string;
      if (typeof raw === 'string') {
        msg = raw;
      } else if (Array.isArray(raw)) {
        // Zod error array: each entry has { path, message } — join human-readable.
        msg = raw
          .map((e: any) => {
            const field = Array.isArray(e?.path) ? e.path.join('.') : e?.path;
            return field ? `${field}: ${e?.message ?? e}` : (e?.message ?? JSON.stringify(e));
          })
          .join('; ');
      } else if (raw && typeof raw === 'object') {
        msg = (raw as any).message || JSON.stringify(raw);
      } else {
        msg = 'Lỗi không xác định';
      }
      throw new ApiError(res.status, msg);
    }
    return (await res.json()) as T;
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
