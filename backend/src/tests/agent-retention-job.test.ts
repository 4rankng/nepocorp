import { after, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq, inArray } from 'drizzle-orm';
import { client, db } from '../db';
import * as s from '../db/schema';
import { disconnectRedis } from '../lib/redis';
import { runRetentionJob } from '../services/agent/retention-job';

/**
 * The retention job prunes agent_messages older than the configured window
 * (default 180 days) plus their orphaned agent_turn_metrics rows. Nothing in the
 * repo drove it before the scheduler wiring, so this pins the two deletes.
 *
 * Hermetic without mutating config: the "old" row is 181 days back, past the
 * default window; the "recent" row uses the schema default (now()).
 */

const createdUserIds: number[] = [];
const createdConversationIds: number[] = [];
const createdMessageIds: number[] = [];

after(async () => {
  if (createdMessageIds.length > 0) {
    await db.delete(s.agentTurnMetrics).where(inArray(s.agentTurnMetrics.messageId, createdMessageIds));
    await db.delete(s.agentMessages).where(inArray(s.agentMessages.id, createdMessageIds));
  }
  if (createdConversationIds.length > 0) {
    await db.delete(s.agentConversations).where(inArray(s.agentConversations.id, createdConversationIds));
  }
  if (createdUserIds.length > 0) {
    await db.delete(s.users).where(inArray(s.users.id, createdUserIds));
  }
  await disconnectRedis();
  await client.end();
});

async function fixtureConversation(): Promise<number> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const [user] = await db.insert(s.users)
    .values({ username: `qa-retention-${suffix}`, passwordHash: 'x', role: 'ADMIN' })
    .returning();
  createdUserIds.push(user.id);
  const [conversation] = await db.insert(s.agentConversations)
    .values({ userId: user.id, role: 'ADMIN' })
    .returning();
  createdConversationIds.push(conversation.id);
  return conversation.id;
}

describe('agent retention job', () => {
  test('prunes only messages past the window and their metrics', async () => {
    const conversationId = await fixtureConversation();

    const old = new Date(Date.now() - 181 * 24 * 3600 * 1000);
    const [oldMessage] = await db.insert(s.agentMessages)
      .values({ conversationId, role: 'user', content: 'old', createdAt: old })
      .returning();
    const [recentMessage] = await db.insert(s.agentMessages)
      .values({ conversationId, role: 'user', content: 'recent' })
      .returning();
    createdMessageIds.push(oldMessage.id, recentMessage.id);

    await db.insert(s.agentTurnMetrics).values({ messageId: oldMessage.id, role: 'user' });

    const result = await runRetentionJob();

    assert.deepEqual(result, { prunedMessages: 1, prunedMetrics: 1, retentionDays: 180 });

    const remaining = await db.select({ id: s.agentMessages.id })
      .from(s.agentMessages)
      .where(inArray(s.agentMessages.id, [oldMessage.id, recentMessage.id]));
    assert.deepEqual(remaining.map((r) => r.id), [recentMessage.id]);

    const metrics = await db.select({ messageId: s.agentTurnMetrics.messageId })
      .from(s.agentTurnMetrics)
      .where(eq(s.agentTurnMetrics.messageId, oldMessage.id));
    assert.equal(metrics.length, 0);
  });
});
