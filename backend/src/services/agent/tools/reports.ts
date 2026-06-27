// Agent tools — deterministic business reports.
// Use these for money/business totals where naive SUMs can violate domain
// rules (VAT, service-fee, ledger running balances, salary deductions).
import { z } from 'zod';
import { getPnlReport, getFuelVarianceReport } from '../../pnl.service';
import { getReceivablesSummary, getCustomerAgingList, getPayablesSummary } from '../../aging.service';
import { getStatementData } from '../../statement.service';
import { computeAllDriverSalaries, computeAttendanceSummary, computeSalary } from '../../attendance.service';
import { listExpenses } from '../../expense.service';
import { db } from '../../../db';
import { defineReadTool, OFFICE_ROLES, ToolError } from '../tool.types';
import { resolvePeriod } from './period';

const reportKeySchema = z.enum([
  'profit_report',
  'fuel_variance',
  'receivables_summary',
  'receivables_aging',
  'payables_summary',
  'customer_statement',
  'salary_driver',
  'salary_all_drivers',
  'salary_attendance',
  'expenses_list',
]);
const reportKeyInputSchema = z.preprocess(normalizeReportKeyInput, reportKeySchema);

const monthSchema = z.coerce.number().int().min(1).max(12).optional();
const yearSchema = z.coerce.number().int().min(2000).optional();

const REPORT_KEY_ALIASES: Record<string, z.infer<typeof reportKeySchema>> = {
  profit: 'profit_report',
  pnl: 'profit_report',
  profitreport: 'profit_report',
  profit_report: 'profit_report',
  'profit.report': 'profit_report',
  fuelvariance: 'fuel_variance',
  fuel_variance: 'fuel_variance',
  'fuel.variance': 'fuel_variance',
  receivablessummary: 'receivables_summary',
  receivables_summary: 'receivables_summary',
  'receivables.summary': 'receivables_summary',
  receivablesaging: 'receivables_aging',
  receivables_aging: 'receivables_aging',
  'receivables.aging': 'receivables_aging',
  payablessummary: 'payables_summary',
  payables_summary: 'payables_summary',
  'payables.summary': 'payables_summary',
  customerstatement: 'customer_statement',
  customer_statement: 'customer_statement',
  'customers.statement': 'customer_statement',
  'customer.statement': 'customer_statement',
  salarydriver: 'salary_driver',
  salary_driver: 'salary_driver',
  'salary.compute': 'salary_driver',
  salaryalldrivers: 'salary_all_drivers',
  salary_all_drivers: 'salary_all_drivers',
  'salary.all_drivers': 'salary_all_drivers',
  salaryattendance: 'salary_attendance',
  salary_attendance: 'salary_attendance',
  'salary.attendance': 'salary_attendance',
  expenseslist: 'expenses_list',
  expenses_list: 'expenses_list',
  'expenses.list': 'expenses_list',
};

function normalizeReportKeyInput(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const exact = raw as z.infer<typeof reportKeySchema>;
  if (reportKeySchema.safeParse(exact).success) return exact;
  const key = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/\s+/g, '')
    .toLowerCase();
  return REPORT_KEY_ALIASES[key] ?? raw;
}

export const reportTools = [
  defineReadTool({
    name: 'report.run',
    description:
      'Chạy báo cáo nghiệp vụ chuẩn bằng service hiện có. Dùng cho tổng tiền/doanh thu/lợi nhuận/công nợ/lương/dầu; KHÔNG tự cộng tiền bằng data.aggregate cho các câu hỏi tài chính.',
    allowedRoles: OFFICE_ROLES,
    params: z.object({
      reportKey: reportKeyInputSchema,
      month: monthSchema,
      year: yearSchema,
      asOfDate: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      customerId: z.coerce.number().int().positive().optional(),
      driverId: z.coerce.number().int().positive().optional(),
      search: z.string().optional(),
      // `category` is the payables enum (maps to ledger TxnTypes in
      // getPayablesSummary). Expenses use a separate expense_categories table,
      // so expenses_list takes the numeric `expenseCategoryId` instead — the
      // enum does not apply there.
      category: z.enum(['fuel', 'ancillary', 'commission', 'carrier']).optional(),
      expenseCategoryId: z.coerce.number().int().positive().optional(),
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    }),
    run: async (args) => {
      switch (args.reportKey) {
        case 'profit_report': {
          const p = resolvePeriod(args.month, args.year);
          return getPnlReport(p.month, p.year);
        }
        case 'fuel_variance': {
          const p = resolvePeriod(args.month, args.year);
          return getFuelVarianceReport(p.month, p.year);
        }
        case 'receivables_summary':
          return getReceivablesSummary({ asOfDate: args.asOfDate });
        case 'receivables_aging':
          return getCustomerAgingList({
            search: args.search,
            asOfDate: args.asOfDate,
            page: args.page,
            limit: args.limit,
          });
        case 'payables_summary':
          return getPayablesSummary({ asOfDate: args.asOfDate, category: args.category });
        case 'customer_statement':
          if (!args.customerId) throw new ToolError('customerId là bắt buộc cho customer_statement', 'invalid_args');
          return getStatementData(args.customerId, args.dateFrom, args.dateTo);
        case 'salary_driver': {
          if (!args.driverId) throw new ToolError('driverId là bắt buộc cho salary_driver', 'invalid_args');
          const p = resolvePeriod(args.month, args.year);
          return computeSalary(args.driverId, p.year, p.month);
        }
        case 'salary_all_drivers': {
          const p = resolvePeriod(args.month, args.year);
          return computeAllDriverSalaries(p.year, p.month);
        }
        case 'salary_attendance': {
          if (!args.driverId) throw new ToolError('driverId là bắt buộc cho salary_attendance', 'invalid_args');
          const p = resolvePeriod(args.month, args.year);
          return computeAttendanceSummary(args.driverId, p.year, p.month);
        }
        case 'expenses_list':
          return listExpenses(db, {
            fromDate: args.dateFrom,
            toDate: args.dateTo,
            categoryId: args.expenseCategoryId,
            page: args.page,
            pageSize: args.limit,
          });
      }
    },
    label: (a) => `Báo cáo ${a.reportKey}`,
  }),
] as const;
