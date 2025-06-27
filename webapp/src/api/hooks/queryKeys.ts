// Centralized query key factory for React Query
export const queryKeys = {
  // Auth
  auth: {
    profile: () => ['auth', 'profile'] as const,
  },

  // Expenses
  expenses: {
    all: () => ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all(), 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.expenses.lists(), filters] as const,
    details: () => [...queryKeys.expenses.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.expenses.details(), id] as const,
    items: (expenseId: number) => [...queryKeys.expenses.detail(expenseId), 'items'] as const,
    item: (expenseId: number, itemId: number) => [...queryKeys.expenses.items(expenseId), itemId] as const,
  },

  // Expense Categories
  expenseCategories: {
    all: () => ['expenseCategories'] as const,
    lists: () => [...queryKeys.expenseCategories.all(), 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.expenseCategories.lists(), filters] as const,
    details: () => [...queryKeys.expenseCategories.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.expenseCategories.details(), id] as const,
    active: () => [...queryKeys.expenseCategories.all(), 'active'] as const,
  },

  // Maintenance
  maintenance: {
    all: () => ['maintenance'] as const,
    lists: () => [...queryKeys.maintenance.all(), 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.maintenance.lists(), filters] as const,
    details: () => [...queryKeys.maintenance.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.maintenance.details(), id] as const,
    expiring: (days?: number) => [...queryKeys.maintenance.all(), 'expiring', days] as const,
    overdue: () => [...queryKeys.maintenance.all(), 'overdue'] as const,
  },

  // Vehicles
  tractors: {
    all: () => ['tractors'] as const,
    lists: () => [...queryKeys.tractors.all(), 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.tractors.lists(), filters] as const,
    details: () => [...queryKeys.tractors.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.tractors.details(), id] as const,
    active: () => [...queryKeys.tractors.all(), 'active'] as const,
  },

  trailers: {
    all: () => ['trailers'] as const,
    lists: () => [...queryKeys.trailers.all(), 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.trailers.lists(), filters] as const,
    details: () => [...queryKeys.trailers.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.trailers.details(), id] as const,
    active: () => [...queryKeys.trailers.all(), 'active'] as const,
  },

  containers: {
    all: () => ['containers'] as const,
    lists: () => [...queryKeys.containers.all(), 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.containers.lists(), filters] as const,
    details: () => [...queryKeys.containers.all(), 'detail'] as const,
    detail: (id: number) => [...queryKeys.containers.details(), id] as const,
    active: () => [...queryKeys.containers.all(), 'active'] as const,
  },

  // Settings
  settings: {
    all: () => ['settings'] as const,
    detail: (key: string) => [...queryKeys.settings.all(), key] as const,
  },

  // Health
  health: {
    status: () => ['health', 'status'] as const,
  },
} as const;