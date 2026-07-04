// TEMPORARY regression oracle — not committed. Run before & after the aging/
// receivables/payables hardening and diff the two stdout snapshots. Numbers
// MUST be byte-identical. Delete this file when the work lands.
//
//   cd backend && npx tsx scripts/_aging-oracle.ts > /tmp/aging-before.json
//   ...apply changes...
//   cd backend && npx tsx scripts/_aging-oracle.ts > /tmp/aging-after.json
//   diff /tmp/aging-before.json /tmp/aging-after.json   # expect no output
import {
  getReceivablesSummary,
  getPayablesSummary,
  getCustomerAgingList,
  getTopOverdueCustomer,
} from '../src/services/aging.service';

async function main() {
  const out: Record<string, unknown> = {};
  out.receivables = await getReceivablesSummary();
  out.payablesDefault = await getPayablesSummary();
  out.payablesFuel = await getPayablesSummary({ category: 'fuel' });
  out.payablesAncillary = await getPayablesSummary({ category: 'ancillary' });
  out.payablesCommission = await getPayablesSummary({ category: 'commission' });
  out.payablesCarrier = await getPayablesSummary({ category: 'carrier' });
  out.agingListAll = await getCustomerAgingList({ limit: 1000 });
  out.topOverdue = await getTopOverdueCustomer();
  process.stdout.write(JSON.stringify(out, null, 2));
  process.exit(0);  // db/redis pools keep Node alive otherwise
}

main().catch((e) => {
  console.error('ORACLE-ERROR', e);
  process.exit(1);
});
