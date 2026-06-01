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
      const details = error.details;
      let msg: string;
      const zodDetails = details ?? (Array.isArray(raw) ? raw : null);
      if (Array.isArray(zodDetails) && zodDetails.length > 0) {
        const FIELD_VI: Record<string, string> = {
          legs: 'Hành trình',
          'legs.origin': 'Điểm đi',
          'legs.destination': 'Điểm đến',
          'legs.km': 'Số km',
          'legs.loadingType': 'Loại tải',
          fuelMode: 'Chế độ nhiên liệu',
          fuelLitersOverride: 'Số lít dầu',
          fuelSupplementLiters: 'Dầu bổ sung',
          fuelSupplementReason: 'Lý do bổ sung',
          tollsDiscount: 'Giảm vé',
          tollsAddition: 'Tăng vé',
          tollsStations: 'Số trạm',
          hasReturnCargo: 'Hàng về',
          driverSalary: 'Tiền kết hợp',
          revenue: 'Doanh thu',
          notes: 'Ghi chú',
          customerId: 'Khách hàng',
          routeId: 'Tuyến đường',
          truckId: 'Xe đầu kéo',
          driverId: 'Tài xế',
          cargoTypeId: 'Loại hàng',
          departureDate: 'Ngày xuất phát',
          containerCount: 'Số container',
          roadAllowanceOverride: 'Điều chỉnh tiền đi đường',
        };
        const MSG_VI: Record<string, string> = {
          'Array must contain at least 1 element': 'Phải có ít nhất 1 chặng hành trình',
          'Number must be greater than 0': 'Giá trị phải lớn hơn 0',
          'Required': 'Trường bắt buộc',
        };
        msg = zodDetails
          .map((e: any) => {
            // Strip numeric array indices so legs.0.km → legs.km for label lookup,
            // but preserve a 1-based index in the visible label (e.g. "Chặng 1 — ").
            const rawPath: Array<string | number> = Array.isArray(e?.path) ? e.path : (e?.path ? [e.path] : []);
            const idx = rawPath.find((s) => typeof s === 'number');
            const namedPath = rawPath.filter((s) => typeof s === 'string').join('.');
            const viField = namedPath ? FIELD_VI[namedPath] || namedPath : '';
            const viMsg = MSG_VI[e?.message] || e?.message || '';
            const prefix = typeof idx === 'number' && namedPath.startsWith('legs')
              ? `Chặng ${Number(idx) + 1} — `
              : '';
            return viField ? `${prefix}${viField}: ${viMsg}` : `${prefix}${viMsg}`;
          })
          .filter(Boolean)
          .join('; ');
      } else if (typeof raw === 'string') {
        msg = raw;
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

export function getAuthenticatedPhotoUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('/api/photos/') || url.includes('/api/photos/')) {
    const token = localStorage.getItem('token');
    if (token) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  return url;
}

