// Agent tools — Navigation suite (agent directives).
// These are NOT read tools: navigate/focus/open/prefill produce a Directive the
// frontend bridge applies (the backend cannot drive the SPA directly). The
// orchestrator detects the `ui.` prefix and emits a `directive` SSE event,
// then feeds a short confirmation back to the LLM so it can keep reasoning.
// `ui.search_pages` IS a read tool — it returns the route catalog so the LLM
// can resolve "trang lương" → salary before calling ui.navigate.
import { z } from 'zod';
import {
  agentRouteKeySchema,
  AGENT_ROUTE_KEYS,
  Role,
  type AgentRouteKey,
} from '@tingting/shared';
import { OFFICE_ROLES, type AgentToolDef, type AgentContext } from '../tool.types';

// OFFICE_ROLES is a readonly tuple of specific enum members; widen to Role[]
// so .includes(ctx.role) type-checks (ctx.role is the full Role union).
const OFFICE_ROLE_SET: readonly Role[] = OFFICE_ROLES;

// Vietnamese descriptions of each navigable page — powers ui.search_pages and
// gives the LLM enough context to pick the right routeKey. Keep in sync with
// AGENT_ROUTE_KEYS (shared) + the frontend directive bridge.
const PAGE_DESCRIPTIONS: Record<AgentRouteKey, string> = {
  dashboard: 'Tổng quan — bảng điều khiển chính, KPI tháng.',
  dispatch: 'Điều vận & phân xe — danh sách chuyến cần điều động, bản đồ GPS.',
  fleet: 'Đội xe — danh sách xe đầu kéo, rơ-moóc, lốp.',
  trips: 'Lệnh vận chuyển — danh sách tất cả chuyến.',
  tripNew: 'Tạo lệnh vận chuyển — form tạo chuyến mới.',
  tripDetail: 'Chi tiết một lệnh vận chuyển.',
  tripEdit: 'Sửa lệnh vận chuyển.',
  finance: 'Báo cáo lãi lỗ (P&L) theo tháng.',
  profit: 'Phân chia lợi nhuận theo quý.',
  debt: 'Công nợ phải thu — danh sách khách nợ.',
  debtDetail: 'Chi tiết công nợ một khách.',
  payables: 'Công nợ phải trả — danh sách nợ nhà cung cấp.',
  payableDetail: 'Chi tiết công nợ phải trả.',
  penalties: 'Kỷ luật — danh sách phạt tài xế.',
  advances: 'Quản lý tạm ứng.',
  adminAdvanceSettlements: 'Duyệt hoàn ứng.',
  salary: 'Lương & Chấm công.',
  expenses: 'Chi phí phát sinh.',
  expenseNew: 'Ghi nhận chi phí phát sinh mới.',
  expenseEdit: 'Sửa chi phí phát sinh.',
  customers: 'Khách hàng — danh sách.',
  suppliers: 'Nhà cung cấp — danh sách.',
  config: 'Cấu hình hệ thống.',
  configCustomers: 'Cấu hình khách hàng.',
  configRoutes: 'Cấu hình tuyến đường.',
  configTrucks: 'Cấu hình xe đầu kéo.',
  configTrailers: 'Cấu hình rơ-moóc.',
  configFuel: 'Cấu hình dầu (định mức, đơn giá).',
  configSalaryPeriods: 'Cấu hình kỳ lương.',
  users: 'Người dùng — danh sách tài khoản.',
  auditLogs: 'Nhật ký thao tác người dùng.',
};

function buildDirectiveTool<A extends z.ZodTypeAny>(
  name: string,
  description: string,
  params: A,
  toDirective: (args: z.infer<A>, ctx: AgentContext) => unknown,
  label: (args: z.infer<A>) => string,
): AgentToolDef {
  return {
    name,
    description,
    params,
    allowedRoles: OFFICE_ROLES,
    async execute(rawArgs, ctx) {
      if (!OFFICE_ROLE_SET.includes(ctx.role)) {
        return { data: null, label: 'Không có quyền' };
      }
      const args = params.parse(rawArgs);
      return { data: toDirective(args, ctx), label: label(args) };
    },
  };
}

export const uiTools: AgentToolDef[] = [
  buildDirectiveTool(
    'ui.navigate',
    'Mở một trang trong ứng dụng (điều hướng SPA). Trả routeKey từ danh sách trang đã biết; dùng ui.search_pages nếu chưa chắc routeKey.',
    z.object({ routeKey: agentRouteKeySchema, params: z.record(z.string(), z.union([z.string(), z.number()])).optional() }),
    (a) => ({ kind: 'navigate', routeKey: a.routeKey, params: a.params }),
    (a) => `Mở trang ${a.routeKey}`,
  ),
  buildDirectiveTool(
    'ui.focus',
    'Mở một trang rồi cuộn + tô sáng một dòng theo id (ví dụ chuyến/khách cụ thể).',
    z.object({
      routeKey: agentRouteKeySchema,
      id: z.union([z.string(), z.number()]),
      prefix: z.string().optional(),
    }),
    (a) => ({ kind: 'focus', routeKey: a.routeKey, id: a.id, prefix: a.prefix }),
    (a) => `Tô sáng ${a.routeKey} #${a.id}`,
  ),
  buildDirectiveTool(
    'ui.open',
    'Mở một thành phần (modal/drawer) đã đăng ký trong trang hiện tại, có thể kèm giá trị nh sẵn (prefill). Dùng cho "mở form tạo chuyến cho khách X".',
    z.object({
      componentId: z.string().min(1),
      prefill: z.record(z.string(), z.unknown()).optional(),
    }),
    (a) => ({ kind: 'open', componentId: a.componentId, prefill: a.prefill }),
    (a) => `Mở ${a.componentId}`,
  ),
  buildDirectiveTool(
    'ui.prefill',
    'Mở + điền sẵn giá trị vào một form (người dùng vẫn tự xác nhận để lưu). Dùng cho "tạo chuyến cho khách X".',
    z.object({
      componentId: z.string().min(1),
      values: z.record(z.string(), z.unknown()),
    }),
    (a) => ({ kind: 'prefill', componentId: a.componentId, values: a.values }),
    (a) => `Điền sẵn ${a.componentId}`,
  ),
  {
    name: 'ui.search_pages',
    description:
      'Tìm trang phù hợp theo từ khoá tiếng Việt (VD "lương", "công nợ", "chi phí"). Trả về danh sách {routeKey, description} để dùng cho ui.navigate/ui.focus.',
    allowedRoles: OFFICE_ROLES,
    params: z.object({ query: z.string().min(1) }),
    async execute(rawArgs, ctx) {
      if (!OFFICE_ROLE_SET.includes(ctx.role)) return { data: [] };
      const { query } = z.object({ query: z.string().min(1) }).parse(rawArgs);
      const q = query.toLowerCase();
      const matches = (AGENT_ROUTE_KEYS as readonly AgentRouteKey[])
        .filter((k) => k.toLowerCase().includes(q) || PAGE_DESCRIPTIONS[k].toLowerCase().includes(q))
        .map((k) => ({ routeKey: k, description: PAGE_DESCRIPTIONS[k] }));
      return { data: matches, label: `${matches.length} trang phù hợp` };
    },
  },
];
