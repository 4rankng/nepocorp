// THROWAWAY diagnostic — delete after use. Counts agent_turn_metrics rows.
import { sql } from 'drizzle-orm';
import { db } from './db';

// drizzle's db.execute() shape depends on the driver: postgres-js returns the
// row array directly, node-postgres wraps it in { rows }. Normalise here.
function rowsOf(r: unknown): any[] {
  if (Array.isArray(r)) return r as any[];
  const maybe = r as { rows?: unknown };
  return Array.isArray(maybe?.rows) ? (maybe.rows as any[]) : [];
}

(async () => {
  const total = await db.execute(sql`select count(*)::int as n from agent_turn_metrics`);
  console.log('[diag] total rows in agent_turn_metrics:', rowsOf(total)[0]?.n);

  const ts = await db.execute(
    sql`select min(created_at) as first, max(created_at) as last from agent_turn_metrics`,
  );
  console.log('[diag] min/max created_at:', rowsOf(ts)[0]);

  const last5 = await db.execute(
    sql`select message_id, created_at, latency_total_ms, error_kind, model
        from agent_turn_metrics
        order by created_at desc
        limit 5`,
  );
  console.log('[diag] last 5 rows:', JSON.stringify(rowsOf(last5), null, 2));

  const since7 = await db.execute(
    sql`select count(*)::int as n from agent_turn_metrics
        where created_at >= now() - interval '7 days'`,
  );
  console.log('[diag] rows in last 7 days (DB now()):', rowsOf(since7)[0]?.n);

  const dbNow = await db.execute(sql`select now() as db_now, current_setting('TIMEZONE') as tz`);
  console.log('[diag] DB now() / tz:', rowsOf(dbNow)[0]);

  process.exit(0);
})().catch((e) => {
  console.error('[diag] ERROR', e);
  process.exit(1);
});
