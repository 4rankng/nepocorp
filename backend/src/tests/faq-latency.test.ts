import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../db';
import { tryFaqFastLane, withFaqLookupBudget } from '../services/agent/faq-fast-lane';
import { embedText } from '../services/llm/embeddings';
import { config } from '../config';
import { invalidateLlmSettings } from '../services/llm/settings';

const entry = {
  id: 1, question: 'Quy định phạt dầu?', answer: 'Câu trả lời đã duyệt.',
  variants: ['quy dinh phat dau'], requiredTerms: ['phat', 'dau'],
  forbiddenTerms: ['thang'], hasEmbedding: true,
};

describe('optional FAQ lookup does not delay business analysis', () => {
  test('exact FAQ answers still avoid the embedding provider', async (t) => {
    t.mock.method(db, 'select', () => ({ from: () => ({ where: async () => [entry] }) }) as never);
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected embedding'); });
    assert.deepEqual(await tryFaqFastLane('Quy định phạt dầu?'), {
      entryId: 1, question: entry.question, answer: entry.answer, score: 1, stage: 'exact',
    });
    assert.equal(fetch.mock.callCount(), 0);
  });

  for (const scenario of [
    { name: 'a data question with no eligible FAQ terms', row: entry, message: 'Phân tích lợi nhuận tháng này' },
    { name: 'a matching forbidden term', row: entry, message: 'Tiền phạt dầu tháng này' },
    { name: 'a FAQ without an indexed embedding', row: { ...entry, hasEmbedding: false }, message: 'Tính tiền phạt dầu' },
  ]) {
    test(`skips provider and vector search for ${scenario.name}`, async (t) => {
      t.mock.method(db, 'select', () => ({ from: () => ({ where: async () => [scenario.row] }) }) as never);
      const execute = t.mock.method(db, 'execute', async () => { throw new Error('Unexpected vector lookup'); });
      const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected embedding'); });
      assert.equal(await tryFaqFastLane(scenario.message), null);
      assert.equal(fetch.mock.callCount(), 0);
      assert.equal(execute.mock.callCount(), 0);
    });
  }

  test('a slow provider yields to the normal agent and receives cancellation', async () => {
    let aborted = false;
    const result = await withFaqLookupBudget((signal) => new Promise((resolve) => {
      signal.addEventListener('abort', () => { aborted = true; resolve(null); }, { once: true });
    }), undefined, 10);
    assert.equal(result, null);
    assert.equal(aborted, true);
  });

  test('a canceled user turn does not start lookup work', async () => {
    let started = false;
    const controller = new AbortController();
    controller.abort();
    const result = await withFaqLookupBudget(async () => { started = true; return 'answer'; }, controller.signal);
    assert.equal(result, null);
    assert.equal(started, false);
  });

  test('canceling a turn aborts an in-flight optional lookup', async () => {
    const controller = new AbortController();
    let lookupSignal: AbortSignal | undefined;
    const pending = withFaqLookupBudget((signal) => {
      lookupSignal = signal;
      return new Promise(() => {});
    }, controller.signal);
    controller.abort();
    assert.equal(await pending, null);
    assert.equal(lookupSignal?.aborted, true);
  });

  test('a completed lookup keeps its answer', async () => {
    const answer = { answer: entry.answer };
    assert.equal(await withFaqLookupBudget(async () => answer), answer);
  });

  test('embedding never starts HTTP or key lookup after cancellation', async (t) => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected HTTP'); });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(embedText('anything', { signal: controller.signal }), { name: 'AbortError' });
    assert.equal(fetch.mock.callCount(), 0);
  });

  test('a running embedding HTTP request is aborted when the FAQ budget expires', async (t) => {
    const previousKey = config.openrouterApiKey;
    config.openrouterApiKey = 'local-faq-test-key';
    invalidateLlmSettings();
    t.after(() => { config.openrouterApiKey = previousKey; invalidateLlmSettings(); });
    t.mock.method(db, 'select', () => ({ from: () => ({ where: async () => [] }) }) as never);
    let fetchSignal: AbortSignal | null | undefined;
    const fetch = t.mock.method(globalThis, 'fetch', async (_url: Parameters<typeof globalThis.fetch>[0], init?: RequestInit) => {
      fetchSignal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        fetchSignal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      });
    });
    const result = await withFaqLookupBudget((signal) => embedText('phạt dầu', { signal }), undefined, 250);
    assert.equal(result, null);
    assert.equal(fetch.mock.callCount(), 1);
    assert.equal(fetchSignal?.aborted, true);
  });
});
