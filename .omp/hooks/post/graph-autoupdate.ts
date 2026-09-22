/**
 * understand-anything — knowledge-graph auto-update nudge.
 *
 * The plugin ships this as a Claude Code `PostToolUse` hook that matches
 * `git commit|merge|cherry-pick|rebase` and injects `additionalContext`
 * telling the agent to run the incremental update. It is a *prompt injector*,
 * not a builder: only the agent can re-analyze files, so the hook's whole job
 * is to make sure the agent notices the graph went stale.
 *
 * That hook lives in the plugin's own `hooks.json` / `.claude/settings.json`,
 * neither of which this harness reads — which is why `.ua/` silently fell two
 * commits behind. This is the same contract on the surface this harness does
 * read: `<cwd>/.omp/hooks/{pre,post}/*.ts` (see omp://hooks.md).
 *
 * Nothing here may throw into the tool pipeline — a stale graph is a nuisance,
 * a broken bash tool is not. Every path is guarded.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookAPI } from '@oh-my-pi/pi-coding-agent/extensibility/hooks';

/** Same trigger set as the plugin's hook. */
const COMMIT_COMMAND = /\bgit\s+(commit|merge|cherry-pick|rebase)\b/;

const AUTO_UPDATE_PROMPT = '~/.understand-anything-plugin/hooks/auto-update-prompt.md';

/** Legacy `.understand-anything/` wins when present, else `.ua/`. */
function resolveDataDir(root: string): string | null {
  for (const name of ['.understand-anything', '.ua']) {
    const dir = join(root, name);
    if (existsSync(dir)) return dir;
  }
  return null;
}

function readJsonField(file: string, field: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))[field];
  } catch {
    return undefined;
  }
}

function gitHead(root: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/**
 * The nudge to inject, or null when there is nothing to say: auto-update is
 * off, no graph exists yet, or the graph already matches HEAD.
 */
function stalenessNotice(root: string): string | null {
  const dataDir = resolveDataDir(root);
  if (!dataDir) return null;
  if (readJsonField(join(dataDir, 'config.json'), 'autoUpdate') !== true) return null;
  if (!existsSync(join(dataDir, 'knowledge-graph.json'))) return null;

  const analyzed = readJsonField(join(dataDir, 'meta.json'), 'gitCommitHash');
  const head = gitHead(root);
  if (typeof analyzed !== 'string' || !head || analyzed === head) return null;

  return [
    `[understand-anything] The knowledge graph is STALE: it was analyzed at ${analyzed.slice(0, 8)}`,
    `but HEAD is now ${head.slice(0, 8)}.`,
    `Read ${AUTO_UPDATE_PROMPT} and execute its instructions to update`,
    `${dataDir}/knowledge-graph.json incrementally.`,
    'Do not ask the user for confirmation — just do it.',
  ].join(' ');
}

export default function graphAutoUpdate(pi: HookAPI): void {
  // The session-start nudge fires once per process so a long session is not
  // spammed on every agent start. The commit nudge deliberately does NOT
  // de-duplicate: each commit adds drift, and suppressing the second nudge
  // would let the graph fall further behind exactly when it matters.
  let sessionNudged = false;

  // A commit just landed — surface the nudge in the very tool result the agent
  // is about to read, exactly where the plugin's PostToolUse hook lands.
  pi.on('tool_result', async (event, ctx) => {
    try {
      if (event.toolName !== 'bash' || event.isError) return;
      if (!COMMIT_COMMAND.test(String(event.input?.command ?? ''))) return;

      const notice = stalenessNotice(ctx.cwd);
      if (!notice) return;
      return { content: [...event.content, { type: 'text', text: `\n\n${notice}` }] };
    } catch {
      // Never let a graph check break a tool call.
    }
  });

  // Session started on an already-stale graph (e.g. the commit was made by
  // another harness, or the graph drifted while the session was closed).
  pi.on('before_agent_start', async (_event, ctx) => {
    try {
      if (sessionNudged) return;
      const notice = stalenessNotice(ctx.cwd);
      if (!notice) return;
      sessionNudged = true;
      return {
        message: {
          customType: 'understand-anything-stale',
          content: notice,
          display: true,
        },
      };
    } catch {
      // Same reasoning as above.
    }
  });
}
