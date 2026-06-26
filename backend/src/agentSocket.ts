// Real-time transport for the command-and-insight assistant: socket.io on the
// `/agent` namespace, attached to the same http.Server Express uses.
//
// Replaces the former `POST /api/agent/chat` SSE handler with the same
// contract: the orchestrator's `emit(event)` is wired to `socket.emit`, so
// `tool_start` / `tool_result` / `directive` stream live and the terminal
// `done` / `error` frames close the turn. Conversation-history stays on REST.
//
// Auth mirrors `middleware/auth.ts`: the JWT travels in the socket.io handshake
// (`auth.token`) so the bot still impersonates the caller; the handshake is
// rejected on an invalid/expired/blacklisted token. Office roles + BOT_ENABLE
// only — same gate as the SSE handler and the frontend launcher.
import type { Server as HttpServer } from 'http';
import { Server, type Namespace, type Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { Role, type AgentEvent } from '@tingting/shared';
import type { AuthUser } from './middleware/auth';
import { isTokenBlacklisted } from './lib/redis';
import { runAgent } from './services/agent/orchestrator';
import type { AgentContext } from './services/agent/tool.types';

const OFFICE_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT];

interface ChatInput {
  message?: string;
  conversationId?: string;
  /** The SPA route the user is on when they ask — gives the LLM page context. */
  currentRouteKey?: string;
}

/**
 * Attach the assistant socket.io server. Returns the io instance (for graceful
 * shutdown) or null when the bot is disabled — nothing to serve, and the
 * launcher is hidden client-side too.
 */
export function initAgentSocket(server: HttpServer): Server | null {
  if (!config.botEnabled) {
    console.log('[agent-socket] skipped — BOT_ENABLE off');
    return null;
  }
  const io = new Server(server, {
    path: '/socket.io',
    // Mirror the Express CORS policy (dev: the Vite origin; prod: CORS_ORIGIN).
    cors: {
      origin: config.corsOrigin
        ? config.corsOrigin.split(',').map((s) => s.trim())
        : config.nodeEnv === 'development'
          ? ['http://localhost:7173']
          : [],
      credentials: true,
    },
  });
  const agentNs = io.of('/agent');
  registerAuth(agentNs);
  registerHandlers(agentNs);
  console.log('[agent-socket] listening on /agent (path /socket.io)');
  return io;
}

/** JWT handshake — reject before the namespace `connection` event fires. */
function registerAuth(agentNs: Namespace): void {
  agentNs.use(async (socket, next) => {
    const token = (socket.handshake.auth?.token as string | undefined)?.trim();
    if (!token) return next(new Error('Token không hợp lệ'));
    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthUser & { jti?: string };
      if (payload.jti && (await isTokenBlacklisted(payload.jti))) {
        return next(new Error('Token đã bị thu hồi'));
      }
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Token hết hạn hoặc không hợp lệ'));
    }
  });
}

function registerHandlers(agentNs: Namespace): void {
  agentNs.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser | undefined;
    // Defense in depth: auth passed, but re-check the office-role gate (mirrors
    // the Casbin `agent` policy + frontend launcher visibility).
    if (!user || !OFFICE_ROLES.includes(user.role)) {
      socket.emit('agent:event', { event: 'error', message: 'Trợ lý chưa được bật' } satisfies AgentEvent);
      socket.disconnect();
      return;
    }
    console.log(`[agent-socket] connected: ${user.username ?? user.userId}`);
    // Room = user, so future cross-tab fan-out (e.g. push directives) is cheap.
    void socket.join(String(user.userId));

    // At most one in-flight turn per socket — a new message (or cancel, or
    // disconnect) aborts the previous, mirroring the SSE `req.on('close')`.
    let current: AbortController | null = null;

    socket.on('agent:chat', async (input: ChatInput | null | undefined) => {
      const message = input?.message;
      if (typeof message !== 'string' || !message.trim()) {
        socket.emit('agent:event', { event: 'error', message: 'Thiếu nội dung tin nhắn' } satisfies AgentEvent);
        return;
      }
      current?.abort();
      const ac = new AbortController();
      current = ac;

      const ctx: AgentContext = {
        userId: user.userId,
        role: user.role,
        username: user.username ?? undefined,
        currentRouteKey: input?.currentRouteKey,
      };
      // Drop events for an already-aborted turn (client moved on / disconnected).
      const emit = (ev: AgentEvent): void => {
        if (!ac.signal.aborted) socket.emit('agent:event', ev);
      };

      try {
        const { response, conversationId: convId } = await runAgent({
          ctx,
          message,
          conversationId: input?.conversationId,
          emit,
          signal: ac.signal,
        });
        if (!ac.signal.aborted) {
          socket.emit('agent:event', { event: 'done', response, conversationId: convId } satisfies AgentEvent);
        }
      } catch (e) {
        console.error('[agent-socket] chat failed', e);
        // Generic message only — never relay raw error text over the wire.
        if (!ac.signal.aborted) {
          socket.emit('agent:event', { event: 'error', message: 'Đã có lỗi khi xử lý. Vui lòng thử lại.' } satisfies AgentEvent);
        }
      } finally {
        if (current === ac) current = null;
      }
    });

    socket.on('agent:cancel', () => current?.abort());
    socket.on('disconnect', (reason) => {
      console.log(`[agent-socket] disconnected: ${user.username ?? user.userId} (${reason})`);
      current?.abort();
    });
  });
}
