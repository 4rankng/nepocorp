// AgentDirectiveProvider — the component half of the bot → SPA bridge.
//
// This file exports ONLY the AgentDirectiveProvider component so React Fast
// Refresh hot-reloads it cleanly; the context object + useAgentDirectives hook
// live in AgentDirectiveContext.tsx.
//
// The hard case is "navigate THEN open a modal on the new page": the handler
// for the target page isn't mounted yet. So open/prefill directives that find
// no registered handler are STASHED in a pending map keyed by componentId and
// replayed the instant the target page registers its handler (on mount). A
// `?agent=open:<componentId>` URL seed does the same for a cold mount / F5.
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { highlightElement } from '../lib/agentHighlight';
import { useToast } from '../components/shared/Toast';
import { type AgentDirective } from '@tingting/shared';
import {
  AgentDirectiveContext,
  type DirectiveOutcome,
  type OpenHandler,
} from './AgentDirectiveContext';
import { resolvePath } from './agentDirectivePath';

// resolvePath lives in ./agentDirectivePath so this module exports only the
// AgentDirectiveProvider component (React Fast Refresh).
export function AgentDirectiveProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

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
    (d: AgentDirective): DirectiveOutcome => {
      switch (d.kind) {
        case 'navigate': {
          const path = resolvePath(d.routeKey, d.params);
          // fade/slide-* via React Router's View Transitions integration
          // (progressive enhancement; slide-* currently render as fade).
          const animation = d.animation ?? 'fade';
          navigate(path, { viewTransition: animation !== 'none' });
          if (d.highlight?.targetId) {
            // Target page mounts async — retry briefly so route code-splitting,
            // data hooks, and drawer close animations do not make the spotlight
            // miss. Fire-and-forget: `send` stays synchronous for the chat ack
            // contract (never await inside this synchronous handler).
            void highlightWhenReady(d.highlight.targetId, d.highlight.durationMs);
          }
          return { status: 'ok' };
        }
        case 'focus': {
          // Navigate to the page, then drop a ?focus= seed so the page's
          // useFocusDeepLink scrolls + highlights (pages without it just navigate).
          // fdur carries the optional ring duration.
          navigate(resolvePath(d.routeKey, { id: d.id }));
          const params: Record<string, string> = { focus: String(d.id) };
          if (d.durationMs) params.fdur = String(d.durationMs);
          setSearchParams(params, { replace: true });
          return { status: 'ok' };
        }
        case 'open':
        case 'prefill': {
          const handler = handlers.current.get(d.componentId);
          if (handler) {
            handler(d);
            return { status: 'ok' };
          } else {
            // Target page not mounted yet — stash for when it registers.
            const q = pending.current.get(d.componentId) ?? [];
            q.push(d);
            pending.current.set(d.componentId, q);
            return { status: 'ok', reason: 'pending-mount' };
          }
        }
        case 'toast': {
          toast({ kind: d.variant, message: d.message, duration: d.durationMs });
          return { status: 'ok' };
        }
        case 'scrollTo': {
          const found = highlightElement(d.targetId, d.durationMs ?? 2000);
          return found
            ? { status: 'ok' }
            : { status: 'error', reason: `#${d.targetId} không có trên trang` };
        }
      }
    },
    [navigate, setSearchParams, toast],
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

/** Retry assistant highlighting until the target mounts or 1.8s elapses.
 *  The caller remains synchronous so directive acknowledgements stay immediate. */
function highlightWhenReady(targetId: string, durationMs?: number): Promise<boolean> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const attempt = () => {
      if (highlightElement(targetId, durationMs)) return resolve(true);
      if (performance.now() - startedAt > 1800) return resolve(false);
      window.setTimeout(attempt, 120);
    };
    window.setTimeout(attempt, 180);
  });
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
