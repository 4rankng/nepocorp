import { ApiError } from './errors';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

type RequestInitWithSkip = RequestInit & { expectedUpdatedAt?: string };

/**
 * Thin wrapper around `fetch` for the project's REST API. Knows nothing
 * about domain shapes, Zod, or Vietnamese — see `./errors.ts` for error
 * translation. Endpoints are constructed in `api/*Client.ts` so this stays
 * purely transport-level.
 */
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

  private async request<T>(
    path: string,
    options?: RequestInitWithSkip,
    skipContentType = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(skipContentType ? {} : { 'Content-Type': 'application/json' }),
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...((options?.headers as Record<string, string> | undefined) || {}),
    };
    if (options?.expectedUpdatedAt) {
      headers['If-Unmodified-Since'] = options.expectedUpdatedAt;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) throw await ApiError.fromResponse(res);
    return (await res.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }
  post<T>(path: string, body: unknown, opts?: { expectedUpdatedAt?: string }) {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...opts,
    });
  }
  put<T>(path: string, body: unknown, opts?: { expectedUpdatedAt?: string }) {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...opts,
    });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  /** Fetch a text response (e.g. HTML) with auth headers via GET. */
  async getForText(url: string): Promise<string> {
    const headers: Record<string, string> = {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
    const res = await fetch(`${API_BASE}${url}`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(res.status, null, text || `Request failed: ${res.status}`);
    }
    return res.text();
  }

  /** Fetch a binary blob (PDF, XLSX, etc.) with auth headers. */
  async getBlob(url: string): Promise<Blob> {
    const headers: Record<string, string> = {
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
    const res = await fetch(`${API_BASE}${url}`, { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(res.status, null, text || `Request failed: ${res.status}`);
    }
    return res.blob();
  }

  /** POST JSON body and receive a binary blob response. */
  async postForBlob(url: string, body: unknown): Promise<Blob> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(res.status, null, text || `Request failed: ${res.status}`);
    }
    return res.blob();
  }

  /** POST JSON body and receive a text response (e.g. HTML). */
  async postForText(url: string, body: unknown): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
    const res = await fetch(`${API_BASE}${url}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ApiError(res.status, null, text || `Request failed: ${res.status}`);
    }
    return res.text();
  }

  /** Upload files with auth headers (multipart/form-data). */
  async upload(url: string, formData: FormData): Promise<unknown> {
    return this.request<unknown>(
      url,
      { method: 'POST', body: formData },
      true, // skip Content-Type — browser sets the multipart boundary
    );
  }
}

export const api = new ApiClient();
