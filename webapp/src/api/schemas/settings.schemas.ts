import { z } from 'zod';
import { AuditableEntitySchema, ApiResponseSchema } from './common.schemas';

// Settings schema
export const SettingSchema = AuditableEntitySchema.extend({
  key: z.string().min(1),
  value: z.any(), // Settings can have various value types
  description: z.string().optional(),
});

// Request schemas
export const UpdateSettingRequestSchema = z.object({
  value: z.any(),
});

// API response schemas
export const SettingApiResponseSchema = ApiResponseSchema(SettingSchema);
