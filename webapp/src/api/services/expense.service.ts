import { BaseService } from './base.service';
import { apiClient } from '@api/client/apiClient';
import { ApiResponse } from '@api/types';
import {
  Expense,
  ExpenseItem,
  ExpenseCategory,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateExpenseItemRequest,
  UpdateExpenseItemRequest,
  ExpenseFilters
} from '@api/types/expense.types';

class ExpenseService extends BaseService<Expense, CreateExpenseRequest, UpdateExpenseRequest> {
  constructor() {
    super('/expense');
  }

  // Override getAll to support expense-specific filters
  async getAll(params?: ExpenseFilters & { page?: number; limit?: number }): Promise<ApiResponse<Expense[]>> {
    return super.getAll(params);
  }

  // Expense item management
  async getItems(expenseId: number): Promise<ApiResponse<ExpenseItem[]>> {
    return apiClient.get<ExpenseItem[]>(`${this.resourcePath}/${expenseId}/item`);
  }

  async getItemById(expenseId: number, itemId: number): Promise<ApiResponse<ExpenseItem>> {
    return apiClient.get<ExpenseItem>(`${this.resourcePath}/${expenseId}/item/${itemId}`);
  }

  async createItem(expenseId: number, data: CreateExpenseItemRequest): Promise<ApiResponse<ExpenseItem>> {
    return apiClient.post<ExpenseItem>(`${this.resourcePath}/${expenseId}/item`, data);
  }

  async updateItem(expenseId: number, itemId: number, data: UpdateExpenseItemRequest): Promise<ApiResponse<ExpenseItem>> {
    return apiClient.put<ExpenseItem>(`${this.resourcePath}/${expenseId}/item/${itemId}`, data);
  }

  async deleteItem(expenseId: number, itemId: number): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`${this.resourcePath}/${expenseId}/item/${itemId}`);
  }

  // Convenience methods
  async getByTractor(tractorId: number, page = 1, limit = 10): Promise<ApiResponse<Expense[]>> {
    return this.getAll({ tractor_id: tractorId, page, limit });
  }

  async getByTrailer(trailerId: number, page = 1, limit = 10): Promise<ApiResponse<Expense[]>> {
    return this.getAll({ trailer_id: trailerId, page, limit });
  }

  async getByCategory(categoryId: number, page = 1, limit = 10): Promise<ApiResponse<Expense[]>> {
    return this.getAll({ expense_category_id: categoryId, page, limit });
  }

  async getByDateRange(startDate: string, endDate: string, page = 1, limit = 10): Promise<ApiResponse<Expense[]>> {
    return this.getAll({ start_date: startDate, end_date: endDate, page, limit });
  }
}

class ExpenseCategoryService extends BaseService<ExpenseCategory, Partial<ExpenseCategory>, Partial<ExpenseCategory>> {
  constructor() {
    super('/expense_category');
  }

  async getActive(): Promise<ApiResponse<ExpenseCategory[]>> {
    return this.getWithFilters({ is_active: true });
  }
}

export const expenseService = new ExpenseService();
export const expenseCategoryService = new ExpenseCategoryService();