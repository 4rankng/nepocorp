import { z } from 'zod';
import {
  AuditableEntitySchema,
  PaymentStatusSchema,
  CurrencySchema,
  ApiResponseSchema,
} from './common.schemas';

// Vehicle schema (simplified for expense relations)
export const VehicleSchema = z.object({
  id: z.number().positive(),
  license_plate: z.string().min(1),
  description: z.string().optional(),
});

// Expense Category schema
export const ExpenseCategorySchema = AuditableEntitySchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  is_active: z.boolean(),
});

// Expense Item schema
export const ExpenseItemSchema = AuditableEntitySchema.extend({
  expense_id: z.number().positive(),
  item_name: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().positive(),
  tax_rate: z.number().min(0).max(100),
  total: z.number().positive(),
});

// Expense schema
export const ExpenseSchema = AuditableEntitySchema.extend({
  tractor_id: z.number().positive().nullable().optional(),
  trailer_id: z.number().positive().nullable().optional(),
  vendor_name: z.string().min(1),
  expense_category_id: z.number().positive(),
  subtotal: z.number().positive(),
  tax_rate: z.number().min(0).max(100),
  total: z.number().positive(),
  payment_status: PaymentStatusSchema,
  payment_proof: z.string().url().optional(),
  currency: CurrencySchema,
  remark: z.string().optional(),
  tractor: VehicleSchema.optional(),
  trailer: VehicleSchema.optional(),
  expense_category: ExpenseCategorySchema.optional(),
  items: z.array(ExpenseItemSchema).optional(),
});

// Request schemas
export const CreateExpenseRequestSchema = z
  .object({
    tractor_id: z.number().positive().optional(),
    trailer_id: z.number().positive().optional(),
    vendor_name: z.string().min(1, 'Vendor name is required'),
    expense_category_id: z.number().positive(),
    subtotal: z.number().positive(),
    tax_rate: z.number().min(0).max(100),
    total: z.number().positive(),
    payment_status: PaymentStatusSchema,
    payment_proof: z.string().url().optional(),
    currency: CurrencySchema.default('VND'),
    remark: z.string().optional(),
    items: z
      .array(
        z.object({
          item_name: z.string().min(1),
          price: z.number().positive(),
          quantity: z.number().positive(),
          tax_rate: z.number().min(0).max(100),
          total: z.number().positive(),
        })
      )
      .min(1, 'At least one item is required'),
  })
  .refine(
    data => {
      // Ensure either tractor_id or trailer_id is provided, but not both
      const hasTractor = !!data.tractor_id;
      const hasTrailer = !!data.trailer_id;
      return hasTractor !== hasTrailer;
    },
    {
      message: 'Either tractor_id or trailer_id is required (but not both)',
    }
  );

export const UpdateExpenseRequestSchema = CreateExpenseRequestSchema.partial();

export const CreateExpenseItemRequestSchema = z.object({
  item_name: z.string().min(1, 'Item name is required'),
  price: z.number().positive(),
  quantity: z.number().positive(),
  tax_rate: z.number().min(0).max(100),
  total: z.number().positive(),
});

export const UpdateExpenseItemRequestSchema = CreateExpenseItemRequestSchema.partial();

// API response schemas
export const ExpensesApiResponseSchema = ApiResponseSchema(z.array(ExpenseSchema));
export const ExpenseApiResponseSchema = ApiResponseSchema(ExpenseSchema);
export const ExpenseItemsApiResponseSchema = ApiResponseSchema(z.array(ExpenseItemSchema));
export const ExpenseItemApiResponseSchema = ApiResponseSchema(ExpenseItemSchema);
export const ExpenseCategoriesApiResponseSchema = ApiResponseSchema(z.array(ExpenseCategorySchema));
export const ExpenseCategoryApiResponseSchema = ApiResponseSchema(ExpenseCategorySchema);
