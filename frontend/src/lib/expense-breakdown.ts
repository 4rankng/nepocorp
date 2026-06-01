interface ExpenseTypeOption {
  code: string;
  name: string;
}

interface ExpenseLike {
  expenseType: string;
  amount: string | number;
}

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
    const label = expenseTypeOptions.find(t => t.code === exp.expenseType)?.name ?? exp.expenseType;
    groups.set(label, (groups.get(label) ?? 0) + Number(exp.amount));
  }
  return groups;
}
