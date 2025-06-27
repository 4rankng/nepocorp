// Common API response types based on backend documentation

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T;
  pagination?: PaginationInfo;
}

export interface ApiError {
  status: 'error';
  message: string;
  errors: {
    code: number;
    message: string;
  };
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total_pages: number;
  records_count: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
}

// Common entity fields
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface AuditableEntity extends BaseEntity {
  created_by: number;
  last_updated_by?: string;
}

// Common enums
export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED'
}

export enum Currency {
  VND = 'VND',
  USD = 'USD'
}

// Error codes from documentation
export enum ApiErrorCode {
  BAD_REQUEST = 4001,
  NOT_FOUND = 4004,
  UNAUTHORIZED = 4010,
  INTERNAL_SERVER_ERROR = 5000
}