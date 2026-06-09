interface ExpenseTypeOption {
  code: string;
  name: string;
}

interface ExpenseLike {
  expenseType: string;
  buyAmount: string | number;
}

/** Vietnamese fallback labels for expense type codes */
const EXPENSE_TYPE_VI: Record<string, string> = {
  LIFTING: 'Nâng container',
  LOWERING: 'Hạ container',
  CUSTOMS: 'Hải quan',
  WEIGHING: 'Cân hàng',
  INFRASTRUCTURE: 'Hạ tầng',
  INSPECTION: 'Kiểm tra',
  INSPECTION_SVC: 'Dịch vụ kiểm tra',
  PORT_STORAGE: 'Lưu bãi',
  CLEANING: 'Vệ sinh container',
  OTHER: 'Khác',
};

/**
 * Group expenses by their human-readable type label,
 * accumulating total amounts per category.
 */
export function groupExpensesByType(
  expenses: readonly ExpenseLike[],
  expenseTypeOptions: readonly ExpenseTypeOption[],
): Map<string, number> {
  const groups = new Map<string, number>();
  for (const exp of expenses) {
    const label = expenseTypeOptions.find(t => t.code === exp.expenseType)?.name ?? EXPENSE_TYPE_VI[exp.expenseType] ?? exp.expenseType;
    groups.set(label, (groups.get(label) ?? 0) + Number(exp.buyAmount));
  }
  return groups;
}
