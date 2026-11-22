// NEPO QA unblock — verify seeded demo data via the demo API (runs INSIDE demo-backend-1).
const BASE = 'http://127.0.0.1:3090/api';
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { userId: 1, username: 'admin', email: 'admin@nepo.vn', fullName: 'Trần Văn Admin', role: 'ADMIN', jti: require('crypto').randomUUID() },
  process.env.JWT_SECRET, { expiresIn: '1h' },
);
const H = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
const get = async (p) => {
  const r = await fetch(BASE + p, { headers: H });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 200); }
  return { status: r.status, j };
};
const put = async (p, b) => {
  const r = await fetch(BASE + p, { method: 'PUT', headers: H, body: JSON.stringify(b) });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t.slice(0, 200); }
  return { status: r.status, j };
};
const log = (label, v) => console.log(`\n=== ${label} ===\n` + JSON.stringify(v, null, 1).slice(0, 1600));

(async () => {
  // 1. customer search by 'Chè'
  for (const q of ['q=Ch%C3%A8', 'search=Ch%C3%A8', 'q=Che']) {
    const r = await get(`/customers?${q}`);
    const rows = Array.isArray(r.j) ? r.j : (r.j.items ?? r.j.data ?? []);
    console.log(`customers?${q} → ${r.status} count=${rows.length}` + (rows.length ? ` names=${rows.map(c => c.name).slice(0,3).join(' | ')}` : ''));
  }

  // 2. shipments list
  const list = await get('/shipments');
  const items = list.j.items ?? list.j.data ?? list.j;
  log('shipments list', { status: list.status, total: list.j.totalItems ?? list.j.total ?? null,
    codes: Array.isArray(items) ? items.map(s => `${s.shipmentCode}(cust=${s.customerName})`) : items });

  // 3. shipment detail 4
  const d = await get('/shipments/4');
  log('shipment detail', { status: d.status, code: d.j.shipmentCode, flowType: d.j.flowType,
    customer: d.j.customerName, trips: d.j.trips?.map(t => `${t.tripCode}/${t.licensePlate ?? t.plate ?? t.truckLicensePlate}`),
    docs: d.j.documents?.map(x => x.docType), costs: d.j.costs?.map(c => `${c.description}=${c.amount}${c.awaitingInvoice ? '/chờ HĐ' : ''}`) });

  // 4. statement — FIFO rows + surplus
  const st = await get('/ledger/customers/42/statement');
  const rows = st.j.ledgerRows ?? st.j.rows ?? [];
  log('statement payment rows', { status: st.status, n: rows.length,
    payments: rows.filter(r => r.txnType === 'PAYMENT_RECEIVED').map(r => `id=${r.id} receipt=${r.receiptId} credit=${r.credit} note=${r.note}`),
    revenues: rows.filter(r => r.txnType === 'TRIP_REVENUE').map(r => `id=${r.id} debit=${r.debit} note=${r.note}`) });

  // 5. shipment profit report
  const pr = await get('/reports/shipment-profit?shipmentId=4');
  log('shipment-profit', { status: pr.status, body: typeof pr.j === 'object' ? pr.j : String(pr.j).slice(0, 300) });

  // 5b. dashboard ops + SOA kỳ 11/2026 (NEPO-62/63 non-empty check)
  const dash = await get('/reports/dashboard');
  console.log(`dashboard ${dash.status} lockedTrips=${dash.j?.lockedTrips} tripCount=${dash.j?.tripCount}`);
  const soa = await get('/ledger/customers/soa?from=2026-11-01&to=2026-11-30');
  const soaRows = soa.j?.rows ?? [];
  const cheRow = soaRows.find(r => (r.customerName ?? '').includes('Chè'));
  console.log(`soa ${soa.status} rows=${soaRows.length} che=${JSON.stringify(cheRow ?? null)}`);

  // 6. by-receipt edit round-trip (probe +1đ, then restore)
  const e1 = await put('/payments/by-receipt/42/9399', { amount: 16724401, receiptId: '9399', receivedDate: '2026-10-05', paymentMethod: 'BANK' });
  const e2 = await put('/payments/by-receipt/42/9399', { amount: 16724400, receiptId: '9399', receivedDate: '2026-10-05', paymentMethod: 'BANK' });
  log('by-receipt edit round-trip', { edit: e1.status, restore: e2.status, editBody: e1.j, restoreBody: e2.j });
})().catch(e => { console.error('VERIFY FAIL', e); process.exit(1); });
