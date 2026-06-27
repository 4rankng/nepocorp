// MiniMax LLM connection constants — hardcoded (NO env vars).
//
// All MiniMax + agent-orchestration constants live here as a single source of
// truth. We deliberately do NOT read these from the environment (per project
// decision): the values had drifted across `backend/.env`, `backend/.env.example`,
// and the config zod defaults. Only TWO values remain env-driven —
// `BOT_ENABLE` (on/off) and `MINIMAX_API_KEY` (secret); everything else is a
// constant imported from here.
//
// A MODEL_STRONG tier is reserved for future task-complexity routing (P2) and is
// intentionally unused today. MiniMax-M3 is a hybrid reasoning model that
// prepends `<think>` blocks to every response (even in json_object mode) and
// adds wall-clock + parsing cost we have not yet benchmarked, so the bot stays
// on the fast `highspeed` line until a latency benchmark justifies routing.

/** Model used for every MiniMax call (ReAct loop + final structured answer). */
export const MODEL_FAST = 'MiniMax-M2.7-highspeed';

/** OpenAI-compatible Chat Completions endpoint (international host). */
export const MINIMAX_BASE_URL = 'https://api.minimax.io/v1';

/** Per-call HTTP timeout (ms). AbortController fires at this boundary; an abort
 *  surfaces as a `timeout` MiniMaxError code. Applies to every call path. */
export const MINIMAX_TIMEOUT_MS = 60_000;

/** Hard cap on the ReAct tool-calling loop (runaway guard). */
export const AGENT_MAX_ITERATIONS = 6;
