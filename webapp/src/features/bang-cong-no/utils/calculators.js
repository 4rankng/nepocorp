// Financial calculation utilities

export const calculateBalanceSummary = transactions => {
  if (!transactions || !Array.isArray(transactions)) {
    return {
      totalDebit: 0,
      totalCredit: 0,
      balance: 0,
      transactionCount: 0,
    };
  }

  const summary = transactions.reduce(
    (acc, transaction) => {
      const debit = parseFloat(transaction.debit) || 0;
      const credit = parseFloat(transaction.credit) || 0;

      acc.totalDebit += debit;
      acc.totalCredit += credit;
      acc.transactionCount++;

      return acc;
    },
    {
      totalDebit: 0,
      totalCredit: 0,
      transactionCount: 0,
    }
  );

  summary.balance = summary.totalDebit - summary.totalCredit;

  return summary;
};

export const calculateCustomerBalance = (transactions, customerId) => {
  if (!transactions || !Array.isArray(transactions)) {
    return { balance: 0, transactionCount: 0 };
  }

  const customerTransactions = transactions.filter(t => t.customer_id === customerId);

  const balance = customerTransactions.reduce((acc, transaction) => {
    const debit = parseFloat(transaction.debit) || 0;
    const credit = parseFloat(transaction.credit) || 0;
    return acc + debit - credit;
  }, 0);

  return {
    balance,
    transactionCount: customerTransactions.length,
  };
};

export const calculatePartnerBalance = (transactions, partnerId) => {
  if (!transactions || !Array.isArray(transactions)) {
    return { balance: 0, transactionCount: 0 };
  }

  const partnerTransactions = transactions.filter(t => t.partner_id === partnerId);

  const balance = partnerTransactions.reduce((acc, transaction) => {
    const debit = parseFloat(transaction.debit) || 0;
    const credit = parseFloat(transaction.credit) || 0;
    return acc + debit - credit;
  }, 0);

  return {
    balance,
    transactionCount: partnerTransactions.length,
  };
};

export const calculateRunningBalance = transactions => {
  if (!transactions || !Array.isArray(transactions)) {
    return [];
  }

  // Sort transactions by date
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.transaction_date) - new Date(b.transaction_date)
  );

  let runningBalance = 0;

  return sortedTransactions.map(transaction => {
    const debit = parseFloat(transaction.debit) || 0;
    const credit = parseFloat(transaction.credit) || 0;
    runningBalance += debit - credit;

    return {
      ...transaction,
      runningBalance,
    };
  });
};

export const calculateMonthlyTotals = transactions => {
  if (!transactions || !Array.isArray(transactions)) {
    return {};
  }

  const monthlyTotals = {};

  transactions.forEach(transaction => {
    const date = new Date(transaction.transaction_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyTotals[monthKey]) {
      monthlyTotals[monthKey] = {
        totalDebit: 0,
        totalCredit: 0,
        balance: 0,
        transactionCount: 0,
      };
    }

    const debit = parseFloat(transaction.debit) || 0;
    const credit = parseFloat(transaction.credit) || 0;

    monthlyTotals[monthKey].totalDebit += debit;
    monthlyTotals[monthKey].totalCredit += credit;
    monthlyTotals[monthKey].balance += debit - credit;
    monthlyTotals[monthKey].transactionCount++;
  });

  return monthlyTotals;
};

export const calculateStatsOverview = transactions => {
  if (!transactions || !Array.isArray(transactions)) {
    return {
      totalReceivable: 0,
      totalPayable: 0,
      netBalance: 0,
      overdueCount: 0,
      recentTransactions: 0,
    };
  }

  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);

  const summary = transactions.reduce(
    (acc, transaction) => {
      const debit = parseFloat(transaction.debit) || 0;
      const credit = parseFloat(transaction.credit) || 0;
      const transactionDate = new Date(transaction.transaction_date);

      // Receivables are debit amounts
      if (debit > 0) {
        acc.totalReceivable += debit;
      }

      // Payables are credit amounts
      if (credit > 0) {
        acc.totalPayable += credit;
      }

      // Check for overdue transactions (simplified: more than 30 days old)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      if (transactionDate < thirtyDaysAgo && debit > 0) {
        acc.overdueCount++;
      }

      // Recent transactions (last month)
      if (transactionDate >= oneMonthAgo) {
        acc.recentTransactions++;
      }

      return acc;
    },
    {
      totalReceivable: 0,
      totalPayable: 0,
      netBalance: 0,
      overdueCount: 0,
      recentTransactions: 0,
    }
  );

  summary.netBalance = summary.totalReceivable - summary.totalPayable;

  return summary;
};

export const calculateGrowthRate = (currentValue, previousValue) => {
  if (!previousValue || previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
};

export const calculatePercentage = (value, total) => {
  if (!total || total === 0) return 0;
  return (value / total) * 100;
};

export const roundToTwoDecimals = value => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const calculateAverageTransaction = transactions => {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return 0;
  }

  const totalAmount = transactions.reduce((acc, transaction) => {
    const debit = parseFloat(transaction.debit) || 0;
    const credit = parseFloat(transaction.credit) || 0;
    return acc + Math.max(debit, credit);
  }, 0);

  return totalAmount / transactions.length;
};
