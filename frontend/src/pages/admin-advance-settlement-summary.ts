export interface SettlementExpenseSummaryItem {
  tripId: number;
  containerNumber?: string | null;
}

export interface SettlementExpenseSummary {
  expenseCount: number;
  tripCount: number;
  containerCount: number;
  label: string;
}

export function summarizeSettlementExpenses(
  expenses: SettlementExpenseSummaryItem[] | undefined,
): SettlementExpenseSummary {
  const items = expenses ?? [];
  const expenseCount = items.length;
  const tripCount = new Set(items.map(expense => expense.tripId)).size;
  const containerCount = new Set(
    items
      .map(expense => expense.containerNumber?.trim())
      .filter((containerNumber): containerNumber is string => Boolean(containerNumber)),
  ).size;

  return {
    expenseCount,
    tripCount,
    containerCount,
    label: expenseCount === 0
      ? '0 khoản chi · Chưa có phạm vi liên kết'
      : `${expenseCount} khoản chi · ${tripCount} chuyến · ${containerCount} container`,
  };
}
