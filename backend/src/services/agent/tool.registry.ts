// Agent tool registry — assembles every domain's tools and filters per role.
//
// `getToolsForRole` is the single entry the orchestrator calls to get the
// tool list advertised to MiniMax. Filtering here keeps the per-call tool list
// small (R-tool-breadth: ~40 tools is a lot for an LLM; a role sees only its
// subset). Every tool ALSO re-checks role inside execute (defense in depth).
import { Role } from '@tingting/shared';
import type { AgentToolDef } from './tool.types';
import { tripTools } from './tools/trips';
import { receivablesTools } from './tools/receivables';
import { payablesTools } from './tools/payables';
import { financeTools } from './tools/finance';
import { expenseTools } from './tools/expenses';
import { advanceTools } from './tools/advances';
import { salaryTools } from './tools/salary';
import { fleetTools } from './tools/fleet';
import { approvalTools } from './tools/approvals';
import { ledgerTools } from './tools/ledger';
import { auditTools } from './tools/audit';
import { analyzerTools } from './tools/analyzers';
import { uiTools } from './tools/ui';

// The full library. Order matters only for readability of any debug dump;
// the LLM selects by name+description, not position.
const ALL_TOOLS: AgentToolDef[] = [
  ...uiTools,
  ...tripTools,
  ...receivablesTools,
  ...payablesTools,
  ...financeTools,
  ...expenseTools,
  ...advanceTools,
  ...salaryTools,
  ...fleetTools,
  ...approvalTools,
  ...ledgerTools,
  ...auditTools,
  ...analyzerTools,
];

// v1: office staff only. DRIVER / FORWARDER get an empty list (their portal
// tool sets are Phase 2). ADMIN/MANAGER/ACCOUNTANT see the full set today;
// the per-tool allowedRoles still gates anything narrower later.
const V1_ALLOWED_ROLES = new Set<Role>([Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT]);

export function getToolsForRole(role: Role): AgentToolDef[] {
  if (!V1_ALLOWED_ROLES.has(role)) return [];
  return ALL_TOOLS.filter((t) => t.allowedRoles.includes(role));
}

/** Lookup by name (orchestrator resolves an LLM tool_call to its def). */
export function findTool(name: string): AgentToolDef | undefined {
  return ALL_TOOLS.find((t) => t.name === name);
}
