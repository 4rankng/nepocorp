import { AuditableEntity, PaymentStatus, Currency } from './common.types';

// Expense types
export interface Expense extends AuditableEntity {
  tractor_id?: number | null;
  trailer_id?: number | null;
  vendor_name: string;
  expense_category_id: number;
  subtotal: number;
  tax_rate: number;
  total: number;
  payment_status: PaymentStatus;
  payment_proof?: string;
  currency: Currency;
  remark?: string;
  tractor?: Vehicle;
  trailer?: Vehicle;
  expense_category?: ExpenseCategory;
  items?: ExpenseItem[];
}

export interface ExpenseItem extends AuditableEntity {
  expense_id: number;
  item_name: string;
  price: number;
  quantity: number;
  tax_rate: number;
  total: number;
}

export interface ExpenseCategory extends AuditableEntity {
  name: string;
  description?: string;
  is_active: boolean;
}

export interface Vehicle {
  id: number;
  license_plate: string;
  description?: string;
}

// Request types
export interface CreateExpenseRequest {
  tractor_id?: number;
  trailer_id?: number;
  vendor_name: string;
  expense_category_id: number;
  subtotal: number;
  tax_rate: number;
  total: number;
  payment_status: PaymentStatus;
  payment_proof?: string;
  currency?: Currency;
  remark?: string;
  items: CreateExpenseItemRequest[];
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {}

export interface CreateExpenseItemRequest {
  item_name: string;
  price: number;
  quantity: number;
  tax_rate: number;
  total: number;
}

export interface UpdateExpenseItemRequest extends Partial<CreateExpenseItemRequest> {}

// Filter types
export interface ExpenseFilters {
  tractor_id?: number;
  trailer_id?: number;
  expense_category_id?: number;
  payment_status?: PaymentStatus;
  vendor_name?: string;
  start_date?: string;
  end_date?: string;
}