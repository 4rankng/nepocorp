// NEPO-43 evidence capture: customer statement via API.
// Usage: node scripts/capture-statement.mjs <customerId> <outPath> [label]
const token = process.env.NEPO_TOKEN;
if (!token) throw new Error('NEPO_TOKEN env required');
const customerId = process.argv[2];
const outPath = process.argv[3];
const res = await fetch(`http://localhost:3090/api/ledger/customers/${customerId}/statement`, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();
if (data.error) {
  console.log(`ERROR: ${data.error}`);
  process.exit(1);
}
const { writeFileSync } = await import('node:fs');
writeFileSync(outPath, JSON.stringify(data, null, 2));
const rows = data.ledgerRows ?? [];
const revs = rows.filter((r) => r.txnType === 'TRIP_REVENUE');
const unrevs = rows.filter((r) => r.txnType === 'UNLOCK_REVERSAL');
console.log(`${process.argv[4] ?? 'statement'} customer=${data.customer.id} name="${data.customer.name}" rows=${rows.length} totalOutstanding=${data.totalOutstanding} currentTotalOutstanding=${data.currentTotalOutstanding} TRIP_REVENUE=${revs.length} UNLOCK_REVERSAL=${unrevs.length}`);
for (const u of unrevs) console.log(`REV trip=${u.txnId} credit=${u.credit} ts=${u.timestamp} note="${u.note}"`);
