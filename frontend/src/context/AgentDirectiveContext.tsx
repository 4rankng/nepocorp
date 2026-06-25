// AgentDirectiveContext — the bridge between a Directive (from the bot) and
// the actual SPA. Three directive kinds map to three effects:
//
//   navigate / focus → react-router navigate (+ ?focus= for scroll/highlight,
//                       reusing the existing useFocusDeepLink pattern)
//   open / prefill   → call a per-page handler registered via useAgentOpenable
//
// The hard case is "navigate THEN open a modal on the new page": the handler
// for the target page isn't mounted yet. So open/prefill directives that find
// no registered handler are STASHED in a pending map keyed by componentId and
// replayed the instant the target page registers its handler (on mount). A
// `?agent=open:<componentId>` URL seed does the same for a cold mount / F5.
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { routes } from '../lib/routes';
import type { AgentDirective, AgentRouteKey } from '@tingting/shared';

type OpenHandler = (d: Extract<AgentDirective, { kind: 'open' | 'prefill' }>) => void;

interface AgentDirectiveContextValue {
  /** Apply a directive (called by useAgentChat + action chips). */
  send: (d: AgentDirective) => void;
  /** Register a modal/form handler for the current page (used by useAgentOpenable). */
  register: (componentId: string, handler: OpenHandler) => void;
  unregister: (componentId: string) => void;
}

const AgentDirectiveContext = createContext<AgentDirectiveContextValue | null>(null);

/** Resolve a routeKey + optional params to an SPA path via the routes registry. */
function resolvePath(routeKey: AgentRouteKey, params?: Record<string, string | number>): string {
  const entry = (routes as Record<string, unknown>)[routeKey];
  if (typeof entry === 'function') {
    // Detail/edit routes take a single id. Accept any of the common param
    // keys the LLM may emit (id, tripId, payableId, debtId, expenseId, …)
    // and fall back to the first numeric value present — otherwise the
    // builder gets 0 and the user lands on an empty /path/0 page.
    const id =
      params?.id ??
      params?.tripId ??
      params?.payableId ??
      params?.debtId ??
      params?.expenseId ??
      (params ? Object.values(params).find((v) => typeof v === 'number' || /^\d+$/.test(String(v))) : undefined) ??
      0;
    return (entry as (id: number | string) => string)(id);
  }
  return typeof entry === 'string' ? entry : routes.dashboard;
}

export function AgentDirectiveProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const handlers = useRef<Map<string, OpenHandler>>(new Map());
  const pending = useRef<Map<string, Extract<AgentDirective, { kind: 'open' | 'prefill' }>[]>>(
    new Map(),
  );

  const flush = useCallback((componentId: string) => {
    const queued = pending.current.get(componentId);
    if (!queued || queued.length === 0) return;
    const handler = handlers.current.get(componentId);
    if (!handler) return;
    for (const d of queued) handler(d);
    pending.current.delete(componentId);
  }, []);

  const register = useCallback(
    (componentId: string, handler: OpenHandler) => {
      handlers.current.set(componentId, handler);
      flush(componentId);
    },
    [flush],
  );

  const unregister = useCallback((componentId: string) => {
    handlers.current.delete(componentId);
  }, []);

  const send = useCallback(
    (d: AgentDirective) => {
      switch (d.kind) {
        case 'navigate': {
          navigate(resolvePath(d.routeKey, d.params));
          break;
        }
        case 'focus': {
          // Navigate to the page, then drop a ?focus= seed so the page's
          // useFocusDeepLink scrolls + highlights (pages without it just navigate).
          navigate(resolvePath(d.routeKey, { id: d.id }));
          setSearchParams({ focus: String(d.id) }, { replace: true });
          break;
        }
        case 'open':
        case 'prefill': {
          const handler = handlers.current.get(d.componentId);
          if (handler) {
            handler(d);
          } else {
            // Target page not mounted yet — stash for when it registers.
            const q = pending.current.get(d.componentId) ?? [];
            q.push(d);
            pending.current.set(d.componentId, q);
          }
          break;
        }
      }
    },
    [navigate, setSearchParams],
  );

  // Cold-mount seed: a shareable/refresh-safe `?agent=open:<componentId>` (with
  // optional prefill encoded as JSON). Consumed once, then cleared — mirrors
  // how useFocusDeepLink cleans its own param.
  useEffect(() => {
    const seed = searchParams.get('agent');
    if (!seed) return;
    const decoded = decodeSeed(seed);
    if (decoded) send(decoded);
    const next = new URLSearchParams(searchParams);
    next.delete('agent');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AgentDirectiveContext.Provider value={{ send, register, unregister }}>
      {children}
    </AgentDirectiveContext.Provider>
  );
}

/** Parse `open:<componentId>` or `open:<componentId>:<base64-json-prefill>`. */
function decodeSeed(raw: string): Extract<AgentDirective, { kind: 'open' | 'prefill' }> | null {
  // Format: `<kind>:<componentId>[:<base64-json>]` where <kind> is the literal
  // 'open'. Splitting on ':' and taking parts[1] as the componentId avoids the
  // old bug where `indexOf(':')` landed on the kind separator and turned the
  // componentId into 'open' (losing the real id, e.g. 'addExpense', and
  // breaking every cold-mount prefill seed).
  const parts = raw.split(':');
  const componentId = parts[1];
  if (!componentId) return { kind: 'open', componentId: raw };
  if (parts.length >= 3) {
    try {
      const values = JSON.parse(atob(parts.slice(2).join(':')));
      return { kind: 'prefill', componentId, values };
    } catch {
      return { kind: 'open', componentId };
    }
  }
  return { kind: 'open', componentId };
}

export function useAgentDirectives(): AgentDirectiveContextValue {
  const ctx = useContext(AgentDirectiveContext);
  if (!ctx) throw new Error('useAgentDirectives must be used within AgentDirectiveProvider');
  return ctx;
}
