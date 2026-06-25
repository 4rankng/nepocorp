// Agent routes — the command-and-insight assistant surface.
//
//   POST /chat            — SSE stream of AgentEvent frames (tool activity,
//                           directives, then a `done` with the final response).
//   GET  /conversations   — the user's recent conversations (sidebar history).
//   GET  /conversations/:id — full message history for one conversation.
//
// Auth/mount: `app.use('/api/agent', authMiddleware, casbinAuthz('agent'), …)`
// — the bot impersonates the caller; Casbin gates office roles. A 503 is
// returned for every route while BOT_ENABLE is off.
import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import * as schema from '../db/schema';
import { config } from '../config';
import { getUser } from '../middleware/auth';
import { runAgent } from '../services/agent/orchestrator';
import type { AgentContext } from '../services/agent/tool.types';
import { agentResponseSchema, type AgentConversation } from '@tingting/shared';

export const agentRoutes = Router();

/** 503 when the feature flag is off — launcher is hidden client-side too. */
function disabled(res: Response): boolean {
  if (!config.botEnabled) {
    res.status(503).json({ enabled: false, message: 'Trợ lý chưa được bật' });
    return true;
  }
  return false;
}

function writeSseFrame(res: Response, payload: unknown): void {
  // The client may have disconnected (req 'close' → AbortController.abort)
  // between frames; writing to a closed stream throws
  // ERR_STREAM_WRITE_AFTER_END and would escape as an unhandled rejection.
  if (res.destroyed || res.writableEnded) return;
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  } catch {
    /* socket already gone — nothing more to do */
  }
}

agentRoutes.post('/chat', async (req: Request, res: Response) => {
  if (disabled(res)) return;
  const user = getUser(req);
  const { message, conversationId, currentRouteKey } = (req.body ?? {}) as {
    message?: string;
    conversationId?: string;
    currentRouteKey?: string;
  };
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Thiếu nội dung tin nhắn' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Disables nginx buffering so frames flush immediately (R3).
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const ctx: AgentContext = {
    userId: user.userId,
    role: user.role,
    username: user.username ?? undefined,
    currentRouteKey,
  };

  // Abort the upstream MiniMax call if the client disconnects mid-stream.
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  try {
    const { response, conversationId: convId } = await runAgent({
      ctx,
      message,
      conversationId,
      emit: (event) => writeSseFrame(res, event),
      signal: ac.signal,
    });
    writeSseFrame(res, { event: 'done', response, conversationId: convId });
  } catch (e) {
    console.error('[agent] chat failed', e);
    // Generic message only — never relay raw error text (Drizzle/PG errors can
    // leak schema/SQL identifiers) over the SSE stream.
    writeSseFrame(res, { event: 'error', message: 'Đã có lỗi khi xử lý. Vui lòng thử lại.' });
  } finally {
    res.end();
  }
});

agentRoutes.get('/conversations', async (req: Request, res: Response) => {
  if (disabled(res)) return;
  try {
    const userId = getUser(req).userId;
    const rows = await db
      .select({
        id: schema.agentConversations.id,
        title: schema.agentConversations.title,
        createdAt: schema.agentConversations.createdAt,
        updatedAt: schema.agentConversations.updatedAt,
      })
      .from(schema.agentConversations)
      .where(eq(schema.agentConversations.userId, userId))
      .orderBy(desc(schema.agentConversations.updatedAt))
      .limit(30);
    res.json(rows.map((r) => ({ ...r, id: String(r.id), messages: [] })));
  } catch (e) {
    console.error('[agent] list conversations failed', e);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

agentRoutes.get('/conversations/:id', async (req: Request, res: Response) => {
  if (disabled(res)) return;
  try {
    const userId = getUser(req).userId;
    const id = Number(req.params.id);
    const [conv] = await db
      .select()
      .from(schema.agentConversations)
      .where(eq(schema.agentConversations.id, id))
      .limit(1);
    if (!conv || conv.userId !== userId) {
      res.status(404).json({ error: 'Không tìm thấy' });
      return;
    }
    const messages = await db
      .select()
      .from(schema.agentMessages)
      .where(eq(schema.agentMessages.conversationId, id))
      .orderBy(schema.agentMessages.id);
    const result: AgentConversation = {
      id: String(conv.id),
      title: conv.title ?? undefined,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
      messages: messages.map((m) => {
        // Re-validate persisted jsonb: schema drift / corrupt / degraded rows
        // must not crash InsightCard on history reload. Drop non-conforming
        // responses (MessageBubble falls back to `content`).
        const parsed = m.response != null ? agentResponseSchema.safeParse(m.response) : null;
        return {
          id: String(m.id),
          role: m.role as 'user' | 'assistant',
          content: m.content ?? undefined,
          response: parsed?.success ? parsed.data : undefined,
          createdAt: m.createdAt.toISOString(),
        };
      }),
    };
    res.json(result);
  } catch (e) {
    console.error('[agent] get conversation failed', e);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});
