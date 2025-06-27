import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { expenseService, expenseCategoryService } from '@api/services';
import { queryKeys } from './queryKeys';
import { 
  ExpenseFilters,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateExpenseItemRequest,
  UpdateExpenseItemRequest
} from '@api/types';

// Expenses queries
export const useExpenses = (filters?: ExpenseFilters & { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => expenseService.getAll(filters),
  });
};

export const useExpense = (id: number) => {
  return useQuery({
    queryKey: queryKeys.expenses.detail(id),
    queryFn: () => expenseService.getById(id),
    enabled: !!id,
  });
};

// Infinite query for expense pagination
export const useInfiniteExpenses = (filters?: ExpenseFilters) => {
  return useInfiniteQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: ({ pageParam = 1 }) => expenseService.getAll({ ...filters, page: pageParam, limit: 10 }),
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination && pagination.page < pagination.total_pages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

// Expense mutations
export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseRequest) => expenseService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateExpenseRequest }) => 
      expenseService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => expenseService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.expenses.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() });
    },
  });
};

// Expense Items
export const useExpenseItems = (expenseId: number) => {
  return useQuery({
    queryKey: queryKeys.expenses.items(expenseId),
    queryFn: () => expenseService.getItems(expenseId),
    enabled: !!expenseId,
  });
};

export const useExpenseItem = (expenseId: number, itemId: number) => {
  return useQuery({
    queryKey: queryKeys.expenses.item(expenseId, itemId),
    queryFn: () => expenseService.getItemById(expenseId, itemId),
    enabled: !!expenseId && !!itemId,
  });
};

export const useCreateExpenseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, data }: { expenseId: number; data: CreateExpenseItemRequest }) =>
      expenseService.createItem(expenseId, data),
    onSuccess: (_, { expenseId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.items(expenseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(expenseId) });
    },
  });
};

export const useUpdateExpenseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, itemId, data }: { expenseId: number; itemId: number; data: UpdateExpenseItemRequest }) =>
      expenseService.updateItem(expenseId, itemId, data),
    onSuccess: (_, { expenseId, itemId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.item(expenseId, itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.items(expenseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(expenseId) });
    },
  });
};

export const useDeleteExpenseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ expenseId, itemId }: { expenseId: number; itemId: number }) =>
      expenseService.deleteItem(expenseId, itemId),
    onSuccess: (_, { expenseId, itemId }) => {
      queryClient.removeQueries({ queryKey: queryKeys.expenses.item(expenseId, itemId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.items(expenseId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.detail(expenseId) });
    },
  });
};

// Expense Categories
export const useExpenseCategories = (filters?: { page?: number; limit?: number }) => {
  return useQuery({
    queryKey: queryKeys.expenseCategories.list(filters),
    queryFn: () => expenseCategoryService.getAll(filters),
  });
};

export const useActiveExpenseCategories = () => {
  return useQuery({
    queryKey: queryKeys.expenseCategories.active(),
    queryFn: () => expenseCategoryService.getActive(),
  });
};

export const useExpenseCategory = (id: number) => {
  return useQuery({
    queryKey: queryKeys.expenseCategories.detail(id),
    queryFn: () => expenseCategoryService.getById(id),
    enabled: !!id,
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<{ name: string; description?: string; is_active: boolean }>) =>
      expenseCategoryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active() });
    },
  });
};

export const useUpdateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<{ name: string; description?: string; is_active: boolean }> }) =>
      expenseCategoryService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active() });
    },
  });
};

export const useDeleteExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => expenseCategoryService.delete(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.expenseCategories.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.expenseCategories.active() });
    },
  });
};