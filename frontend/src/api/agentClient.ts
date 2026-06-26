// API client for the command-and-insight assistant.
//
// Two surfaces:
//   - REST (conversation history) via the shared `api` wrapper.
//   - Live chat via socket.io (namespace `/agent`, path `/socket.io`). The JWT
//     travels in the handshake (`auth.token`) so the bot still impersonates the
//     logged-in user — the same reason the old SSE client used raw `fetch`
//     instead of `EventSource` (which cannot send headers).
//
// `streamAgentChat` keeps the old `(input, onEvent) => Promise<void>` contract:
// it resolves on the terminal `done`/`error` frame, so the chat hook is
// transport-agnostic. Each frame is still Zod-validated against `agentEventSchema`.
import { io, type Socket } from 'socket.io-client';
import { api } from '../lib/api';
import { getToken } from '../design-system/hooks/useToken';
import { agentEventSchema, type AgentConversation, type AgentEvent } from '@tingting/shared';

export const agentClient = {
  /** Recent conversations for the current user (sidebar history). */
  listConversations: () => api.get<AgentConversation[]>('/agent/conversations'),

  /** Full message history for one conversation (resume). */
  getConversation: (id: string) =>
    api.get<AgentConversation>(`/agent/conversations/${id}`),
};

export interface StreamChatInput {
  message: string;
  conversationId?: string;
  /** The SPA route the user is on when they ask — gives the LLM page context. */
  currentRouteKey?: string;
  signal?: AbortSignal;
}

// ── Socket lifecycle ─────────────────────────────────────────────────────────
// One socket per token, lazily connected and reused. If the token changes
// (logout / re-login), the old socket is discarded so the handshake re-auths
// with the fresh token.
let cached: { token: string; socket: Socket } | null = null;

function waitForConnect(socket: Socket): Promise<Socket> {
  if (socket.connected) return Promise.resolve(socket);
  return new Promise<Socket>((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onErr);
      reject(new Error('Trợ lý phản hồi quá chậm'));
    }, 10_000);
    const onConnect = () => {
      clearTimeout(timer);
      socket.off('connect_error', onErr);
      resolve(socket);
    };
    const onErr = (err: Error) => {
      clearTimeout(timer);
      socket.off('connect', onConnect);
      reject(new Error(err.message || 'Không kết nối được trợ lý'));
    };
    socket.once('connect', onConnect);
    socket.once('connect_error', onErr);
  });
}

function ensureAgentSocket(): Promise<Socket> {
  const token = getToken();
  if (!token) return Promise.reject(new Error('Chưa đăng nhập'));
  if (cached && cached.token === token) return waitForConnect(cached.socket);
  // Token changed (or first connect) — drop any stale socket.
  if (cached) {
    cached.socket.disconnect();
    cached = null;
  }
  const socket = io('/agent', {
    path: '/socket.io',
    auth: { token },
    // Default transports (polling → websocket upgrade) for max compatibility
    // across the Vite proxy and prod nginx.
  });
  cached = { token, socket };
  return waitForConnect(socket);
}

/** Tear down the socket (e.g. on logout) so the next turn re-auths cleanly. */
export function disposeAgentSocket(): void {
  if (cached) {
    cached.socket.disconnect();
    cached = null;
  }
}

/**
 * Stream an assistant turn. Calls `onEvent` for each validated frame and
 * resolves on the terminal `done`/`error` frame (or on caller abort /
 * disconnect). Mirrors the old SSE contract so the chat hook is unchanged.
 */
export async function streamAgentChat(
  input: StreamChatInput,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const socket = await ensureAgentSocket();

  return new Promise<void>((resolve) => {
    let settled = false;

    const detach = () => {
      socket.off('agent:event', onFrame);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      if (onAbort && input.signal) input.signal.removeEventListener('abort', onAbort);
    };
    const finish = () => {
      if (settled) return;
      settled = true;
      detach();
      resolve();
    };

    const onFrame = (raw: unknown) => {
      const result = agentEventSchema.safeParse(raw);
      if (!result.success) return; // malformed frame — keep listening
      const ev = result.data as AgentEvent;
      onEvent(ev);
      if (ev.event === 'done' || ev.event === 'error') finish();
    };
    // Surface transport-level failures as an error bubble and close the turn.
    const onDisconnect = () => {
      if (settled) return;
      onEvent({ event: 'error', message: 'Mất kết nối với trợ lý' } as AgentEvent);
      finish();
    };
    const onConnectError = (err: Error) => {
      if (settled) return;
      onEvent({ event: 'error', message: err.message || 'Không kết nối được trợ lý' } as AgentEvent);
      finish();
    };

    // Caller abort (useAgentChat aborts the previous in-flight turn before a
    // new send) — tell the server to cancel and close this promise.
    let onAbort: (() => void) | null = null;
    if (input.signal) {
      if (input.signal.aborted) {
        socket.emit('agent:cancel');
        finish();
        return;
      }
      onAbort = () => {
        socket.emit('agent:cancel');
        finish();
      };
      input.signal.addEventListener('abort', onAbort, { once: true });
    }

    socket.on('agent:event', onFrame);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.emit('agent:chat', {
      message: input.message,
      conversationId: input.conversationId,
      currentRouteKey: input.currentRouteKey,
    });
  });
}
