import { AuditableEntity } from './common.types';

// Settings types
export interface Setting extends AuditableEntity {
  key: string;
  value: any;
  description?: string;
}

// Request types
export interface UpdateSettingRequest {
  value: any;
}

// Common setting keys
export enum SettingKey {
  DEFAULT_TAX_RATE = 'default_tax_rate',
  CURRENCY = 'currency',
  DATE_FORMAT = 'date_format',
  PAGINATION_LIMIT = 'pagination_limit'
}