// useAgentChat — drives one assistant conversation.
//
// Sends a user message to the SSE endpoint and folds the streamed events into
// React state: tool activity (for the "thinking" indicator), directives
// (forwarded to the AgentDirective bridge), and the final assistant answer
// (text | insight_card | directive).
//
// Directives arrive two ways: as a mid-stream `directive` event (a ui.* tool
// fired) and as the final `done` response when the whole answer IS a
// navigation. Both are handed to `onDirective`.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  agentClient,
  streamAgentChat,
  sendActionResult,
  loadSavedConversationId,
  persistConversationId,
} from '../api/agentClient';
import type { DirectiveOutcome } from '../context/AgentDirectiveContext';
import type { AgentDirective, AgentEvent, AgentMessage, AgentResponse } from '@tingting/shared';

export interface UseAgentChatOptions {
  /** Called for every directive the stream emits (navigation/open/prefill).
   *  Returns the outcome so navigate/focus can be acked back to the server. */
  onDirective?: (d: AgentDirective) => DirectiveOutcome;
}

export interface UseAgentChat {
  messages: AgentMessage[];
  isThinking: boolean;
  /** The tool currently running, for the thinking indicator. */
  activeTool: { name: string; label?: string } | null;
  error: string | null;
  conversationId: string | null;
  send: (message: string, currentRouteKey?: string) => Promise<void>;
  reset: () => void;
}

function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useAgentChat(opts: UseAgentChatOptions = {}): UseAgentChat {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeTool, setActiveTool] = useState<UseAgentChat['activeTool']>(null);
  const [error, setError] = useState<string | null>(null);
  // Seed from localStorage so a page reload (Vite HMR / service-worker deploy /
  // manual refresh) can rehydrate the same thread instead of starting blank.
  const [conversationId, setConversationId] = useState<string | null>(() => loadSavedConversationId());

  // Keep the latest onDirective in a ref so the streaming callback (created
  // once per send) always sees the current handler.
  const directiveRef = useRef(opts.onDirective);
  directiveRef.current = opts.onDirective;
  const abortRef = useRef<AbortController | null>(null);

  // Persist the active conversationId so the thread can be resumed after a
  // reload. Cleared on logout (see useAuth → clearAgentConversation).
  useEffect(() => {
    persistConversationId(conversationId);
  }, [conversationId]);

  // Rehydrate the thread once on mount: fetch the saved conversation's messages
  // from the DB. A stale/404 id clears itself so the next send starts fresh.
  useEffect(() => {
    const saved = loadSavedConversationId();
    if (!saved) return;
    let cancelled = false;
    agentClient
      .getConversation(saved)
      .then((conv) => {
        // Don't clobber a message the user may have sent before this resolves.
        if (!cancelled && conv.messages?.length) {
          setMessages((prev) => (prev.length ? prev : conv.messages));
        }
      })
      .catch(() => {
        if (!cancelled) setConversationId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEvent = useCallback((event: AgentEvent) => {
    switch (event.event) {
      case 'tool_start':
        setActiveTool({ name: event.toolName, label: undefined });
        break;
      case 'tool_result':
        // Keep the tool name but surface its result label; cleared on `done`.
        setActiveTool({ name: event.toolName, label: event.label });
        break;
      case 'directive': {
        const outcome = directiveRef.current?.(event.directive) ?? { status: 'ok' as const };
        // Ack navigate/focus so the server only says "đã mở" once the page
        // actually applied (or timed out). Other kinds are fire-and-forget.
        if (event.requiresAck && event.actionId) {
          sendActionResult({
            actionId: event.actionId,
            status: outcome.status,
            reason: outcome.reason,
          });
        }
        break;
      }
      case 'done': {
        setActiveTool(null);
        setIsThinking(false);
        if (event.conversationId) setConversationId(event.conversationId);
        const response = event.response as AgentResponse;
        if (response.type === 'directive') {
          directiveRef.current?.(response.directive);
          // A pure-navigation answer: still surface a short confirmation bubble.
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: 'assistant', content: 'Đã mở trang cho bạn.', response, createdAt: new Date().toISOString() },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: 'assistant', response, createdAt: new Date().toISOString() },
          ]);
        }
        break;
      }
      case 'error':
        setActiveTool(null);
        setIsThinking(false);
        setError(event.message);
        break;
    }
  }, []);

  const send = useCallback(
    async (message: string, currentRouteKey?: string) => {
      setError(null);
      setIsThinking(true);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', content: message, createdAt: new Date().toISOString() },
      ]);

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamAgentChat(
          { message, conversationId: conversationId ?? undefined, currentRouteKey, signal: controller.signal },
          handleEvent,
        );
        // Stream closed. If a terminal `done`/`error` frame validated, the
        // handler already cleared isThinking; if the final frame was malformed
        // and silently dropped by the parser, release the spinner so the drawer
        // doesn't hang on a perpetual "thinking" state.
        if (!controller.signal.aborted) {
          setIsThinking(false);
          setActiveTool(null);
        }
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setIsThinking(false);
        setActiveTool(null);
        setError(e instanceof Error ? e.message : 'Lỗi không xác định');
      }
    },
    [conversationId, handleEvent],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setActiveTool(null);
    setIsThinking(false);
    setConversationId(null);
  }, []);

  return { messages, isThinking, activeTool, error, conversationId, send, reset };
}
