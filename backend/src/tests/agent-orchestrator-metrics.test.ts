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
import { computeLatencies, type MetricsAccumulator } from '../services/agent/orchestrator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_SRC = readFileSync(
  join(__dirname, '..', 'services', 'agent', 'orchestrator.ts'),
  'utf8',
);

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
