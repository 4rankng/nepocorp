import { useState, useEffect, useCallback } from 'react';
import { expenseService, expenseCategoryService } from '@api/services';
import {
  ExpenseFilters,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  CreateExpenseItemRequest,
  UpdateExpenseItemRequest,
} from '@api/types';

// Expenses queries
export const useExpenses = (filters?: ExpenseFilters & { page?: number; limit?: number }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseService.getAll(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch expenses'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchExpenses,
  };
};

export const useExpense = (id: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchExpense = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.getById(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch expense'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpense();
  }, [id]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

// Infinite query replacement with pagination state
export const useInfiniteExpenses = (filters?: ExpenseFilters) => {
  const [data, setData] = useState<{ pages: any[]; pageParams: number[] }>({
    pages: [],
    pageParams: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const fetchPage = useCallback(
    async (pageParam = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.getAll({ ...filters, page: pageParam, limit: 10 });
        const { pagination } = response;

        setData(prev => ({
          pages: [...prev.pages, response],
          pageParams: [...prev.pageParams, pageParam],
        }));

        setHasNextPage(pagination && pagination.page < pagination.total_pages);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch expenses'));
        throw err;
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
      }
    },
    [filters]
  );

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    setIsFetchingNextPage(true);
    const nextPageParam =
      data.pageParams.length > 0 ? data.pageParams[data.pageParams.length - 1] + 1 : 1;
    await fetchPage(nextPageParam);
  }, [hasNextPage, isFetchingNextPage, data.pageParams, fetchPage]);

  useEffect(() => {
    setData({ pages: [], pageParams: [] });
    fetchPage(1);
  }, [fetchPage]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
};

// Expense mutations
export const useCreateExpense = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: CreateExpenseRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseService.create(data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create expense');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useUpdateExpense = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: number; data: UpdateExpenseRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseService.update(id, data);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update expense');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useDeleteExpense = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseService.delete(id);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete expense');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

// Expense Items
export const useExpenseItems = (expenseId: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!expenseId) return;

    const fetchExpenseItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.getItems(expenseId);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch expense items'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseItems();
  }, [expenseId]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useExpenseItem = (expenseId: number, itemId: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!expenseId || !itemId) return;

    const fetchExpenseItem = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.getItemById(expenseId, itemId);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch expense item'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseItem();
  }, [expenseId, itemId]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useCreateExpenseItem = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ expenseId, data }: { expenseId: number; data: CreateExpenseItemRequest }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.createItem(expenseId, data);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create expense item');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useUpdateExpenseItem = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({
      expenseId,
      itemId,
      data,
    }: {
      expenseId: number;
      itemId: number;
      data: UpdateExpenseItemRequest;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.updateItem(expenseId, itemId, data);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update expense item');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useDeleteExpenseItem = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({ expenseId, itemId }: { expenseId: number; itemId: number }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseService.deleteItem(expenseId, itemId);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete expense item');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

// Expense Categories
export const useExpenseCategories = (filters?: { page?: number; limit?: number }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchExpenseCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryService.getAll(filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch expense categories'));
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchExpenseCategories();
  }, [fetchExpenseCategories]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchExpenseCategories,
  };
};

export const useActiveExpenseCategories = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchActiveExpenseCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryService.getActive();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch active expense categories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveExpenseCategories();
  }, [fetchActiveExpenseCategories]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
    refetch: fetchActiveExpenseCategories,
  };
};

export const useExpenseCategory = (id: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchExpenseCategory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseCategoryService.getById(id);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch expense category'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenseCategory();
  }, [id]);

  return {
    data,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error && !!data,
  };
};

export const useCreateExpenseCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (data: Partial<{ name: string; description?: string; is_active: boolean }>) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseCategoryService.create(data);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create expense category');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useUpdateExpenseCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{ name: string; description?: string; is_active: boolean }>;
    }) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await expenseCategoryService.update(id, data);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update expense category');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};

export const useDeleteExpenseCategory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await expenseCategoryService.delete(id);
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete expense category');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    mutate,
    mutateAsync: mutate,
    isLoading,
    error,
    isError: !!error,
    isSuccess: !isLoading && !error,
  };
};
