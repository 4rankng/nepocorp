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
import {
  computeLatencies,
  parseAgentResponseContent,
  sanitizeAgentJson,
  trimToolHistory,
  type MetricsAccumulator,
} from '../services/agent/orchestrator.js';
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

  test('at KEEP_RECENT floor, huge tool replies are hard-truncated to fit the budget (valid JSON preserved)', () => {
    // Real tool replies are VALID JSON (compactToolResult); mimic that shape so
    // the hard cap's cutAtSafeBoundary truncates realistically. 3 units × ~30k
    // each; KEEP_RECENT keeps the recent 2 (~60k); the hard cap re-cuts them to
    // fit the 24k budget. Before the cap these survived uncapped — the
    // prompt-bloat driver of the >20s tail (prod metrics 2026-06-28).
    const bigJson = JSON.stringify({
      rows: Array.from({ length: 500 }, (_, i) => ({ id: i, label: 'x'.repeat(40) })),
    });
    const m: MiniMaxMessage[] = [
      sys('s'), user('hi'),
      assistantToolCalls('1'), toolReply('1', bigJson),
      assistantToolCalls('2'), toolReply('2', bigJson),
      assistantToolCalls('3'), toolReply('3', bigJson),
    ];
    const out = trimToolHistory(m);
    // Still 2 seed + the 2 most-recent units — Pass 1 truncated them in place;
    // Pass 2 (the below-KEEP_RECENT fallback) isn't triggered here.
    assert.equal(out.length, 6);
    assert.equal(out[2].role, 'assistant'); // unit #2's assistant turn kept
    assertProtocolSafe(out);
    // Hard cap: serialized output bounded to the 24k tool-history budget + ~1k
    // of seed/system overhead (was ~60k chars before the cap).
    const serialized = JSON.stringify(out).length;
    assert.ok(serialized <= 25_000, `hard cap should bound tool history, got ${serialized}`);
    // Truncated tool replies stay VALID JSON (cutAtSafeBoundary preserves it) —
    // regression guard against the mid-JSON-corruption defect.
    const NOTE = '…(đã cắt)';
    for (const msg of out) {
      if (msg.role === 'tool' && typeof msg.content === 'string' && msg.content.endsWith(NOTE)) {
        const json = msg.content.slice(0, -NOTE.length);
        assert.doesNotThrow(() => JSON.parse(json), 'truncated tool reply must remain valid JSON');
      }
    }
  });

  test('Pass 2 fallback drops oldest whole units (below KEEP_RECENT) when replies cannot be shrunk enough', () => {
    // Many units each with a SMALL (~150-char) reply that cutAtSafeBoundary
    // cannot shrink (it grows sub-~190 inputs → Pass 1 stops immediately via the
    // no-shrink break). Their sum exceeds the 24k budget, so Pass 2 must drop
    // whole units to fit — the "hard cap is actually hard" guarantee. Remaining
    // units stay protocol-safe (every assistant(tool_calls) keeps its replies).
    const small = JSON.stringify({ id: 0, label: 'x'.repeat(130) }); // ~150 chars
    const m: MiniMaxMessage[] = [sys('s'), user('hi')];
    for (let i = 0; i < 120; i++) {
      m.push(assistantToolCalls(String(i)));
      m.push(toolReply(String(i), small));
    }
    const out = trimToolHistory(m);
    assertProtocolSafe(out);
    // Bounded to the budget + seed overhead (was ~32k chars of tool units).
    assert.ok(JSON.stringify(out).length <= 25_000, `Pass 2 should bound tool history, got ${JSON.stringify(out).length}`);
    // Seed always preserved; some units were dropped to fit.
    assert.equal(out[0].role, 'system');
    assert.equal(out[1].role, 'user');
    assert.ok(out.length < m.length, 'Pass 2 should have dropped units to fit the budget');
  });
});

describe('agent final-answer parsing — fallback reducers', () => {
  test('parses a valid assistant JSON response without another final LLM call', () => {
    const parsed = parseAgentResponseContent('<think>hidden</think>{"type":"text","content":"Đã rõ."}');
    assert.deepStrictEqual(parsed, { type: 'text', content: 'Đã rõ.' });
  });

  test('normalizes near-miss insight cards instead of forcing final_schema fallback', () => {
    const parsed = parseAgentResponseContent(JSON.stringify({
      type: 'card',
      title: 'Công nợ',
      summary: 'Tổng công nợ đang tăng.',
      widgets: {
        kind: 'kpi',
        items: [
          { label: 'Công nợ', value: '120.000.000', format: 'vnd_million' },
        ],
      },
      actions: [
        {
          label: 'Mở công nợ',
          directive: { kind: 'navigate', route_key: 'debt' },
        },
      ],
    }));

    assert.ok(parsed);
    assert.strictEqual(parsed.type, 'insight_card');
    if (parsed.type !== 'insight_card') return;
    assert.strictEqual(parsed.widgets[0].type, 'kpi_grid');
    const widget = parsed.widgets[0];
    if (widget.type !== 'kpi_grid') return;
    assert.strictEqual(widget.items[0].value, 120000000);
    assert.strictEqual(widget.items[0].format, 'number');
    assert.strictEqual(parsed.actions?.[0]?.directive.kind, 'navigate');
  });

  test('downgrades widget-less cards to text so useful summaries still validate', () => {
    const out = sanitizeAgentJson({
      type: 'insight_card',
      title: 'Tóm tắt',
      summary: 'Không có dữ liệu phù hợp trong kỳ này.',
      widgets: [],
    });
    assert.deepStrictEqual(out, { type: 'text', content: 'Không có dữ liệu phù hợp trong kỳ này.' });
  });

  test('normalizes object-row tables into schema-safe matrix rows', () => {
    const parsed = parseAgentResponseContent(JSON.stringify({
      type: 'insight_card',
      title: 'Top chi phí',
      summary: 'Có 2 dòng chi phí lớn.',
      widgets: [{
        type: 'table',
        columns: ['name', 'amount'],
        rows: [
          { name: 'Dầu', amount: '1,200,000' },
          { name: 'Sửa chữa', amount: '800000' },
        ],
      }],
    }));

    assert.ok(parsed);
    assert.strictEqual(parsed.type, 'insight_card');
    if (parsed.type !== 'insight_card') return;
    const table = parsed.widgets[0];
    assert.strictEqual(table.type, 'table');
    if (table.type !== 'table') return;
    assert.deepStrictEqual(table.rows, [['Dầu', 1200000], ['Sửa chữa', 800000]]);
  });

  test('Layer 1 healing: trailing comma the model emits is repaired (no fallback call)', () => {
    const parsed = parseAgentResponseContent('{"type":"text","content":"Xong.",}');
    assert.deepStrictEqual(parsed, { type: 'text', content: 'Xong.' });
  });

  test('Layer 1 healing: missing closing brace + single quotes are repaired', () => {
    const parsed = parseAgentResponseContent("{'type':'text','content':'Đã rõ.'");
    assert.ok(parsed, 'should parse after jsonrepair');
    assert.strictEqual(parsed!.type, 'text');
    if (parsed!.type === 'text') assert.strictEqual(parsed!.content, 'Đã rõ.');
  });

  test('Layer 1 healing: a malformed insight_card with multiple defects parses', () => {
    const parsed = parseAgentResponseContent(
      '{"type":"insight_card","title":"Công nợ","summary":"Tăng.","widgets":[{"type":"kpi_grid","items":[{"label":"Nợ","value":120000000,"format":"vnd",}]}],}',
    );
    assert.ok(parsed);
    assert.strictEqual(parsed!.type, 'insight_card');
    if (parsed!.type === 'insight_card') {
      const w = parsed!.widgets[0];
      assert.strictEqual(w.type, 'kpi_grid');
    }
  });

  test('pure prose still yields null (no silent accept of a non-response)', () => {
    // jsonrepair turns prose into a string array; that must NOT validate as an
    // AgentResponse, so the caller falls through to the prose-salvage path.
    assert.strictEqual(parseAgentResponseContent('chỉ là văn bản thường, không có json'), null);
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
      finalAvoided: false,
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
      finalAvoided: false,
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
