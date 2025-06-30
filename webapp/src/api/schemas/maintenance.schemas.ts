import { z } from 'zod';
import { AuditableEntitySchema, ApiResponseSchema } from './common.schemas';

// Maintenance Record schema
export const MaintenanceRecordSchema = AuditableEntitySchema.extend({
  expense_id: z.number().positive(),
  license_plate: z.string().min(1),
  vendor_name: z.string().min(1),
  item_name: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().positive(),
  tax_rate: z.number().min(0).max(100),
  total: z.number().positive(),
  install_date: z.string().datetime(),
  expiry_date: z.string().datetime().optional(),
});

// Request schemas
export const CreateMaintenanceRequestSchema = z.object({
  expense_id: z.number().positive(),
  license_plate: z.string().min(1, 'License plate is required'),
  vendor_name: z.string().min(1, 'Vendor name is required'),
  item_name: z.string().min(1, 'Item name is required'),
  price: z.number().positive(),
  quantity: z.number().positive(),
  tax_rate: z.number().min(0).max(100),
  total: z.number().positive(),
  install_date: z.string().min(1, 'Install date is required'),
  expiry_date: z.string().optional(),
});

export const UpdateMaintenanceRequestSchema = CreateMaintenanceRequestSchema.partial();

// API response schemas
export const MaintenanceRecordsApiResponseSchema = ApiResponseSchema(
  z.array(MaintenanceRecordSchema)
);
export const MaintenanceRecordApiResponseSchema = ApiResponseSchema(MaintenanceRecordSchema);
