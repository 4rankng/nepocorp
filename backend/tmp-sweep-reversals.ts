// THROWAWAY — sweep leftover UNLOCK_REVERSAL rows in current statement display.
import { getStatementData, getSupplierStatement, getCarrierPayableStatement } from './src/services/statement.service';
import { db, client } from './src/db';
import * as s from './src/db/schema';
import { disconnectRedis, invalidateReportCaches } from './src/lib/redis';

async function main() {
  const custRows = await db.select({ id: s.customers.id, name: s.customers.name }).from(s.customers);
  const supRows = await db.select({ id: s.suppliers.id, name: s.suppliers.name }).from(s.suppliers);
  const tripRows = await db.select({ id: s.trips.id, customerId: s.trips.customerId }).from(s.trips);
  const custByTrip = new Map(tripRows.map(t => [t.id, t.customerId]));

  let custLeft = 0, custLone = 0;
  for (const c of custRows) {
    const data = await getStatementData(c.id);
    if (!data) continue;
    for (const r of data.ledgerRows) {
      if (r.txnType !== 'UNLOCK_REVERSAL') continue;
      custLeft++;
      // lone = no matching original (same trip, mirrored amount) anywhere in this book
      const mirror = data.ledgerRows.some((o) => o.txnType !== 'UNLOCK_REVERSAL' && o.txnId === r.txnId
        && (Number(o.debit) === Number(r.credit) && Number(r.credit) > 0 || Number(o.credit) === Number(r.debit) && Number(r.debit) > 0));
      if (!mirror) {
        custLone++;
        if (custLone <= 10) console.log(`CUST-LEFT book=${c.id}(${c.name.slice(0, 30)}) row=${r.id} txn=${r.txnId} tripOwner=${r.txnId != null ? custByTrip.get(r.txnId) : '?'} d=${r.debit} c=${r.credit} | ${r.note}`);
      }
    }
  }
  console.log(`[cust] books=${custRows.length} reversalRowsLeft=${custLeft} loneUnmatched=${custLone}`);

  let supLeft = 0;
  for (const sp of supRows) {
    const data = await getSupplierStatement(sp.id).catch(() => null);
    if (!data) continue;
    for (const r of data.ledgerRows) {
      if (r.txnType === 'UNLOCK_REVERSAL') { supLeft++; if (supLeft <= 5) console.log(`SUP-LEFT book=${sp.id}(${sp.name.slice(0, 30)}) row=${r.id} | ${r.note}`); }
    }
  }
  console.log(`[sup] books=${supRows.length} reversalRowsLeft=${supLeft}`);

  const carriers = await db.selectDistinct({ id: s.ledger.entityId }).from(s.ledger).where(undefined).limit(0).catch(() => []);
  void carriers;
  // carrier payable needs carrier ids from external carriers table
  const carrierRows = await db.select({ id: s.externalCarriers.id, name: s.externalCarriers.name }).from(s.externalCarriers).catch(() => []);
  let carLeft = 0;
  for (const cr of carrierRows) {
    const data = await getCarrierPayableStatement(cr.id).catch(() => null);
    if (!data) continue;
    for (const r of data.ledgerRows) {
      if (r.txnType === 'UNLOCK_REVERSAL') { carLeft++; if (carLeft <= 5) console.log(`CAR-LEFT book=${cr.id}(${cr.name?.slice(0, 30)}) row=${r.id} | ${r.note}`); }
    }
  }
  console.log(`[carrier] books=${carrierRows.length} reversalRowsLeft=${carLeft}`);

  await invalidateReportCaches();
  await disconnectRedis();
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
