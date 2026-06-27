/**
 * Agent orchestrator metrics — three guards:
 *
 * 1. STATIC guard: the module that writes agent_turn_metrics must NOT import
 *    `SpanProcessor` and must NOT call `span.duration(`. This is the real
 *    protection against the OTel sampling trap: OTel samples at span creation,
 *    so a sampled-out span becomes a NonRecordingSpan whose onEnd never fires.
 *    Writing the row from a SpanProcessor, or sourcing latency from
 *    span.duration(), would silently drop ~90% of normal turns while keeping
 *    100% of error/slow turns — corrupting p95 downward. The performance.now()
 *    timer in withSpan is sampler-independent; that is the only sanctioned
 *    latency source.
 *
 * 2. computeLatencies unit test: the dual-latency invariant holds.
 *    latency_total_ms        = LLM + tools + final          (EXCLUDES ack + persist)
 *    latency_user_perceived  = root duration                (= total + ack + persist + overhead)
 *
 * 3. Sampling-independence: the latency builder is pure arithmetic on
 *    durations — sampler-independent by construction. Assert it produces the
 *    same numbers under OTEL_TRACES_SAMPLER_ARG=0 (ALWAYS_OFF) as under =1.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { computeLatencies, trimToolHistory, type MetricsAccumulator } from '../services/agent/orchestrator.js';
import type { MiniMaxMessage } from '../services/llm/minimax.client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_SRC = readFileSync(
  join(__dirname, '..', 'services', 'agent', 'orchestrator.ts'),
  'utf8',
);

describe('trimToolHistory — P1.1 protocol-safe tool-history trim', () => {
  const sys = (s: string): MiniMaxMessage => ({ role: 'system', content: s });
  const user = (s: string): MiniMaxMessage => ({ role: 'user', content: s });
  const assistantToolCalls = (id: string): MiniMaxMessage => ({
    role: 'assistant',
    content: null,
    tool_calls: [{ id, type: 'function', function: { name: 't', arguments: '{}' } }],
  });
  const toolReply = (id: string, content: string): MiniMaxMessage => ({
    role: 'tool',
    tool_call_id: id,
    name: 't',
    content,
  });
  // Every kept assistant(tool_calls) MUST be immediately followed by its tool
  // reply, or the OpenAI tool-calling API 400s. This is the load-bearing invariant.
  const assertProtocolSafe = (msgs: MiniMaxMessage[]) => {
    for (let i = 0; i < msgs.length; i++) {
      if (msgs[i].role === 'assistant' && (msgs[i].tool_calls?.length ?? 0) > 0) {
        const next = msgs[i + 1];
        assert.ok(next && next.role === 'tool', 'assistant(tool_calls) must be followed by its tool reply');
      }
    }
  };

  test('no tool history → unchanged', () => {
    const m: MiniMaxMessage[] = [sys('s'), user('hi')];
    assert.deepEqual(trimToolHistory(m), m);
  });

  test('under budget → unchanged (every unit kept)', () => {
    const m: MiniMaxMessage[] = [
      sys('s'), user('hi'),
      assistantToolCalls('1'), toolReply('1', 'r1'),
      assistantToolCalls('2'), toolReply('2', 'r2'),
    ];
    assert.deepEqual(trimToolHistory(m), m);
    assertProtocolSafe(trimToolHistory(m));
  });

  test('over budget → oldest unit(s) dropped, seed + recent kept, protocol-safe', () => {
    const big = 'x'.repeat(10_000); // 4 units × ~10k = ~40k > 24k budget
    const m: MiniMaxMessage[] = [
      sys('s'), user('hi'),
      assistantToolCalls('1'), toolReply('1', big),
      assistantToolCalls('2'), toolReply('2', big),
      assistantToolCalls('3'), toolReply('3', big),
      assistantToolCalls('4'), toolReply('4', big),
    ];
    const out = trimToolHistory(m);
    assert.equal(out[0].role, 'system'); // seed preserved
    assert.equal(out[1].role, 'user');
    assert.equal(out.length, 6); // 2 seed + recent 2 units (2 asst + 2 tool)
    assert.equal(out[2], m[6]); // kept unit #3's assistant turn
    assert.equal(out[5], m[9]); // kept unit #4's tool reply
    assertProtocolSafe(out);
  });

  test('never drops below KEEP_RECENT_TOOL_UNITS=2 even when each unit is huge', () => {
    const huge = 'y'.repeat(50_000);
    const m: MiniMaxMessage[] = [
      sys('s'), user('hi'),
      assistantToolCalls('1'), toolReply('1', huge),
      assistantToolCalls('2'), toolReply('2', huge),
      assistantToolCalls('3'), toolReply('3', huge),
    ];
    const out = trimToolHistory(m);
    assert.equal(out.length, 6); // 2 seed + recent 2 units
    assert.equal(out[2], m[4]); // kept unit #2's assistant turn
    assert.equal(out[5], m[7]); // kept unit #3's tool reply
    assertProtocolSafe(out);
  });
});

describe('agent orchestrator metrics — static sampling-trap guard', () => {
  test('orchestrator source does not import SpanProcessor', () => {
    assert.ok(
      !ORCHESTRATOR_SRC.includes('SpanProcessor'),
      'orchestrator.ts must not import SpanProcessor — see telemetry.ts LATENCY CONTRACT',
    );
  });

  test('orchestrator source never reads span.duration(', () => {
    assert.ok(
      !ORCHESTRATOR_SRC.includes('span.duration('),
      'orchestrator.ts must never call span.duration() — latency comes only from withSpan.durationMs / performance.now()',
    );
  });

  test('orchestrator source writes the metrics row via db.insert (not a SpanProcessor.onEnd)', () => {
    assert.ok(
      ORCHESTRATOR_SRC.includes("schema.agentTurnMetrics"),
      'orchestrator.ts must insert into agentTurnMetrics directly',
    );
  });
});

describe('computeLatencies — dual-latency invariant', () => {
  function makeAcc(over: Partial<MetricsAccumulator> = {}): MetricsAccumulator {
    return {
      latencyLlmMs: 0,
      latencyToolsMs: 0,
      latencyFinalMs: 0,
      latencyAckMs: 0,
      latencyPersistMs: 0,
      reactIterations: 0,
      toolCallCount: 0,
      fallbackUsed: false,
      aborted: false,
      navigateDirectiveEmitted: false,
      guardrailFired: false,
      errorKind: undefined,
      ...over,
    };
  }

  test('total = llm + tools + final (excludes ack + persist)', () => {
    // Spec example: llm=100, tools=200, final=50, ack=300, persist=40, root=695
    const acc = makeAcc({
      latencyLlmMs: 100,
      latencyToolsMs: 200,
      latencyFinalMs: 50,
      latencyAckMs: 300,
      latencyPersistMs: 40,
    });
    const lat = computeLatencies(acc, 695);
    assert.strictEqual(lat.latencyTotalMs, 350, 'total = 100+200+50 = 350 (ack+persist excluded)');
    assert.strictEqual(lat.latencyUserPerceivedMs, 695, 'perceived = root duration');
    assert.strictEqual(lat.latencyAckMs, 300, 'ack tracked separately');
    assert.strictEqual(lat.latencyPersistMs, 40, 'persist tracked separately');
  });

  test('invariant: user_perceived = total + ack + persist (+ overhead)', () => {
    const acc = makeAcc({
      latencyLlmMs: 100,
      latencyToolsMs: 200,
      latencyFinalMs: 50,
      latencyAckMs: 300,
      latencyPersistMs: 40,
    });
    const lat = computeLatencies(acc, 695);
    // overhead = 695 - (350 + 300 + 40) = 5ms of loop/control-flow cost
    const overhead = lat.latencyUserPerceivedMs - (lat.latencyTotalMs + lat.latencyAckMs + lat.latencyPersistMs);
    assert.ok(
      overhead >= 0 && overhead < 50,
      `overhead must be small and non-negative, got ${overhead}`,
    );
  });

  test('zeroed accumulator yields zero latencies', () => {
    const lat = computeLatencies(makeAcc(), 0);
    assert.strictEqual(lat.latencyTotalMs, 0);
    assert.strictEqual(lat.latencyUserPerceivedMs, 0);
    assert.strictEqual(lat.latencyAckMs, 0);
    assert.strictEqual(lat.latencyPersistMs, 0);
  });
});

describe('computeLatencies — sampling independence', () => {
  // The builder is pure arithmetic on durations; the OTel sampler has no
  // input to it. Run it under both samplers and assert identical output.
  function run(): ReturnType<typeof computeLatencies> {
    const acc: MetricsAccumulator = {
      latencyLlmMs: 100,
      latencyToolsMs: 200,
      latencyFinalMs: 50,
      latencyAckMs: 300,
      latencyPersistMs: 40,
      reactIterations: 2,
      toolCallCount: 3,
      fallbackUsed: false,
      aborted: false,
      navigateDirectiveEmitted: false,
      guardrailFired: false,
      errorKind: undefined,
    };
    return computeLatencies(acc, 695);
  }

  test('produces identical numbers under ALWAYS_OFF (sampler arg = 0)', () => {
    process.env.OTEL_TRACES_SAMPLER_ARG = '0';
    const lat = run();
    assert.strictEqual(lat.latencyTotalMs, 350);
    assert.strictEqual(lat.latencyUserPerceivedMs, 695);
    assert.strictEqual(lat.latencyAckMs, 300);
    assert.strictEqual(lat.latencyPersistMs, 40);
  });

  test('produces identical numbers under ALWAYS_ON (sampler arg = 1)', () => {
    process.env.OTEL_TRACES_SAMPLER_ARG = '1';
    const lat = run();
    assert.strictEqual(lat.latencyTotalMs, 350);
    assert.strictEqual(lat.latencyUserPerceivedMs, 695);
    assert.strictEqual(lat.latencyAckMs, 300);
    assert.strictEqual(lat.latencyPersistMs, 40);
  });
});
