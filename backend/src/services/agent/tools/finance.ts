// Agent tools — Finance / Profit & Fuel domain.
// The two flagship analyzer backings (getPnlReport, getFuelVarianceReport).
// Casbin `financial`.
import { z } from 'zod';
import { getPnlReport, getFuelVarianceReport } from '../../pnl.service';
import { defineReadTool, OFFICE_ROLES } from '../tool.types';

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2000);

export const financeTools = [
  defineReadTool({
    name: 'profit.report',
    description:
      'Báo cáo lãi lỗ (P&L) theo tháng: doanh thu, chi phí, biên lợi nhuận, chi phí theo nhóm. Dùng cho câu hỏi về lợi nhuận / "tháng này lãi lỗ ra sao".',
    allowedRoles: OFFICE_ROLES,
    params: z.object({ month: monthSchema, year: yearSchema }),
    run: (args) => getPnlReport(args.month, args.year),
    label: (a) => `P&L ${a.month}/${a.year}`,
  }),

  defineReadTool({
    name: 'fuel.variance',
    description:
      'Báo cáo chênh lệch dầu thực tế vs định mức theo từng chuyến trong tháng. Dùng cho "chuyến nào tốn dầu hơn định mức".',
    allowedRoles: OFFICE_ROLES,
    params: z.object({ month: monthSchema, year: yearSchema }),
    run: (args) => getFuelVarianceReport(args.month, args.year),
    label: (a) => `Chênh lệch dầu ${a.month}/${a.year}`,
  }),
] as const;
