// THROWAWAY — carrier payable sweep.
import { getCarrierPayableStatement } from './src/services/statement.service';
import { db, client } from './src/db';
import * as s from './src/db/schema';
import { isNotNull } from 'drizzle-orm';
import { disconnectRedis, invalidateReportCaches } from './src/lib/redis';

async function main() {
  const carriers = await db.selectDistinct({ id: s.trips.externalCarrierId }).from(s.trips).where(isNotNull(s.trips.externalCarrierId));
  let carLeft = 0;
  for (const c of carriers) {
    if (c.id == null) continue;
    const data = await getCarrierPayableStatement(c.id).catch(() => null);
    if (!data) continue;
    for (const r of data.ledgerRows) {
      if (r.txnType === 'UNLOCK_REVERSAL') { carLeft++; if (carLeft <= 5) console.log(`CAR-LEFT book=${c.id} row=${r.id} | ${r.note}`); }
    }
  }
  console.log(`[carrier] books=${carriers.length} reversalRowsLeft=${carLeft}`);
  await invalidateReportCaches();
  await disconnectRedis();
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
