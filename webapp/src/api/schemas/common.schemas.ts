import { z } from 'zod';

// Common schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    status: z.enum(['success', 'error']),
    message: z.string(),
    data: dataSchema,
    pagination: z
      .object({
        page: z.number(),
        limit: z.number(),
        total_pages: z.number(),
        records_count: z.number(),
      })
      .optional(),
  });

export const ApiErrorSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
  errors: z.object({
    code: z.number(),
    message: z.string(),
  }),
});

export const PaginationSchema = z.object({
  page: z.number().positive(),
  limit: z.number().positive(),
  total_pages: z.number().nonnegative(),
  records_count: z.number().nonnegative(),
});

export const BaseEntitySchema = z.object({
  id: z.number().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const AuditableEntitySchema = BaseEntitySchema.extend({
  created_by: z.number().positive(),
  last_updated_by: z.string().optional(),
});

// Enum schemas
export const PaymentStatusSchema = z.enum(['PENDING', 'PAID', 'CANCELLED']);
export const CurrencySchema = z.enum(['VND', 'USD']);
export const UserRoleSchema = z.enum(['admin', 'user', 'viewer']);
