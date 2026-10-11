import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_FAST } from '../services/llm/models';
import { getTelemetryModel } from '../services/llm/minimax.client';

/**
 * Telemetry must name the model the ACTIVE provider will actually call, not a
 * hardcoded constant: an operator switching MiniMax → OpenRouter would otherwise
 * keep seeing MiniMax spans + metrics. Falls back to MODEL_FAST (never throws)
 * so telemetry cannot break a turn — the LLM call itself still raises no_key.
 */

test('getTelemetryModel returns the resolved provider model', async () => {
  assert.strictEqual(await getTelemetryModel(async () => ({ model: 'x/y' })), 'x/y');
});

test('getTelemetryModel falls back to MODEL_FAST when no provider resolves', async () => {
  assert.strictEqual(
    await getTelemetryModel(async () => { throw new Error('no_key'); }),
    MODEL_FAST,
  );
});
