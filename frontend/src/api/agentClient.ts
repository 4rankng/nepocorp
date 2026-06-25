// API client for the command-and-insight assistant.
//
// Two surfaces:
//   - REST (conversation history) via the shared `api` wrapper.
//   - SSE chat via a raw `fetch` + ReadableStream — `EventSource` cannot send
//     the Authorization header, and the bot must act as the logged-in user.
//
// The stream emits one JSON object per SSE `data:` frame; each object carries
// its own `event` discriminator (see AgentEvent in @tingting/shared), so we
// parse + Zod-validate each frame before handing it to the hook.
import { api } from '../lib/api';
import { getToken } from '../design-system/hooks/useToken';
import { agentEventSchema, type AgentConversation, type AgentEvent } from '@tingting/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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

/**
 * Stream an assistant turn. Calls `onEvent` for each validated SSE frame.
 * Resolves when the stream closes (a `done` or `error` frame is the normal end).
 */
export async function streamAgentChat(
  input: StreamChatInput,
  onEvent: (event: AgentEvent) => void,
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/agent/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Hint to any proxy (nginx) not to buffer the SSE stream.
      'X-Request-Mode': 'stream',
    },
    body: JSON.stringify({
      message: input.message,
      conversationId: input.conversationId,
      currentRouteKey: input.currentRouteKey,
    }),
    signal: input.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Agent chat failed: HTTP ${res.status} ${text.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line. Process every complete frame.
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const parsed = parseFrame(frame);
      if (parsed) {
        const result = agentEventSchema.safeParse(parsed);
        if (result.success) onEvent(result.data);
        // Silently drop malformed frames — the stream continues.
      }
    }
  }
}

/** Extract the JSON payload from an SSE frame (`data:` lines). */
function parseFrame(frame: string): unknown {
  const dataLines = frame
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trimStart());
  if (dataLines.length === 0) return null;
  try {
    return JSON.parse(dataLines.join('\n'));
  } catch {
    return null;
  }
}
