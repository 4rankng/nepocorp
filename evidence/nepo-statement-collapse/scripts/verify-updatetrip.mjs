// NEPO-43 API verify: PUT /api/trips/:id/actuals against the fixed backend.
// Usage: node scripts/verify-updatetrip.mjs <tripId> <payloadJsonFile> <outFile>
import { writeFileSync, readFileSync } from 'node:fs';

const token = process.env.NEPO_TOKEN;
if (!token) throw new Error('NEPO_TOKEN env required');
const tripId = Number(process.argv[2]);
const payload = JSON.parse(readFileSync(process.argv[3], 'utf8'));
const base = 'http://localhost:3090';
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const ledgerRowsFor = async (id) => {
  const res = await fetch(`${base}/api/ledger?limit=10000`, { headers: auth }).then((r) => r.json());
  return (res.items ?? []).filter((r) => r.txnId === id);
};

const before = await ledgerRowsFor(tripId);

const res = await fetch(`${base}/api/trips/${tripId}/actuals`, {
  method: 'PUT',
  headers: auth,
  body: JSON.stringify(payload),
});
const trip = await res.json();
if (trip.error) {
  console.log(`ERROR: ${trip.error}`);
  process.exit(1);
}

const after = await ledgerRowsFor(tripId);
const beforeIds = new Set(before.map((r) => r.id));
const newRows = after.filter((r) => !beforeIds.has(r.id));
const customerNew = newRows.filter((r) => r.entityType === 'CUSTOMER');
const result = {
  tripId,
  payload,
  rowsBefore: before.length,
  rowsAfter: after.length,
  newRows: newRows.map((r) => ({ id: r.id, entityType: r.entityType, entityId: r.entityId, txnType: r.txnType, debit: r.debit, credit: r.credit, timestamp: r.timestamp, note: r.note })),
  newCustomerRows: customerNew.length,
  newUnlockReversalCustomer: customerNew.filter((r) => r.txnType === 'UNLOCK_REVERSAL').length,
  newTripRevenueCustomer: customerNew.filter((r) => r.txnType === 'TRIP_REVENUE').length,
  tripVersionAfter: trip.version,
};
writeFileSync(process.argv[4], JSON.stringify(result, null, 2));
console.log(`trip=${tripId} payload=${JSON.stringify(payload)} rows ${result.rowsBefore} -> ${result.rowsAfter} newCustomer=${result.newCustomerRows} (REV=${result.newTripRevenueCustomer}, UNREV=${result.newUnlockReversalCustomer})`);
for (const r of result.newRows) console.log(`  NEW ${r.entityType}/${r.entityId} ${r.txnType} debit=${r.debit} credit=${r.credit} ts=${r.timestamp} note="${r.note}"`);
