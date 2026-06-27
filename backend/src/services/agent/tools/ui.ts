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
  PAGE_CATALOG,
  Role,
  type AgentRouteKey,
  type PageAgentMeta,
} from '@tingting/shared';
import { OFFICE_ROLES, type AgentToolDef, type AgentContext } from '../tool.types';

// OFFICE_ROLES is a readonly tuple of specific enum members; widen to Role[]
// so .includes(ctx.role) type-checks (ctx.role is the full Role union).
const OFFICE_ROLE_SET: readonly Role[] = OFFICE_ROLES;

// Per-key search data, derived from PAGE_CATALOG (single source of truth). The
// LLM resolves a user query ("mau giay bao no", "luong", "cong no") by matching
// the title + description + aliases — not just the routeKey + description it
// used to. The agent-keys sync guard in shared/src/schemas/agent.ts guarantees
// every AgentRouteKey has `agent` data, so `agent!` is safe here.
const PAGE_SEARCH_ENTRIES: ReadonlyArray<{
  routeKey: AgentRouteKey;
  title: string;
  description: string;
  aliases: readonly string[];
}> = (AGENT_ROUTE_KEYS as readonly AgentRouteKey[]).map((k) => {
  // Annotated as PageAgentMeta so optional `aliases` reads uniformly across the
  // catalog's narrow per-entry agent types (only some entries declare aliases).
  const meta: PageAgentMeta = PAGE_CATALOG[k].agent!;
  return {
    routeKey: k,
    title: PAGE_CATALOG[k].title,
    description: meta.description,
    aliases: meta.aliases ?? [],
  };
});

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

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
  // Keep open/prefill out of the advertised tool list until pages actually
  // register component handlers. The system prompt already tells the model not
  // to use them; hiding the tools as well prevents malformed `prefill: "..."`
  // arguments from leaking through as raw Zod errors in the chat bubble.
  {
    name: 'ui.search_pages',
    description:
      'Tìm trang phù hợp theo từ khoá tiếng Việt (VD "lương", "công nợ", "chi phí"). Trả về danh sách {routeKey, description} để dùng cho ui.navigate/ui.focus.',
    allowedRoles: OFFICE_ROLES,
    params: z.object({ query: z.string().min(1) }),
    async execute(rawArgs, ctx) {
      if (!OFFICE_ROLE_SET.includes(ctx.role)) return { data: [] };
      const { query } = z.object({ query: z.string().min(1) }).parse(rawArgs);
      const q = normalizeSearchText(query);
      const matches = PAGE_SEARCH_ENTRIES.filter(
        (p) =>
          normalizeSearchText(p.title).includes(q) ||
          normalizeSearchText(p.description).includes(q) ||
          p.aliases.some((a) => normalizeSearchText(a).includes(q)),
      ).map((p) => ({ routeKey: p.routeKey, description: p.description }));
      return { data: matches, label: `${matches.length} trang phù hợp` };
    },
  },
];
