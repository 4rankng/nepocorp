/**
 * Retire stale saved PAYMENT_STATEMENT documents for a fuel supplier.
 *
 * A saved supplier payment statement is a snapshot of the *payable accruals* the
 * ledger held when it was generated. Documents saved before the fix in
 * `buildSupplierPaymentLines` (backend/src/services/billingDocument.service.ts)
 * listed one line per ledger row and dropped the credit = 0 UNLOCK_REVERSAL
 * rows, so every unlock/re-lock cycle left an extra "Chi phí N lít dầu chuyến X"
 * line behind — the "TRP-202610-0021 ×2 / TRP-202609-0054 ×3" report (kanban
 * 081026232520). A per-trip wrong amount can also survive (225 lít = 50.625₫).
 *
 * This script does NOT rewrite a saved accounting artifact. It cannot honestly
 * recompute those lines: the ledger is append-only and the auto-increment rows
 * those lines mirrored may be gone (a re-seed leaves none), so neither the live
 * charge nor its cancellation can be attributed any more. Rewriting line text or
 * amounts by hand would invent a financial document. Instead it soft-deletes the
 * stale snapshot (the app's own delete path, billingDocument.service.ts:976) so
 * the operator regenerates it from the live ledger with the fixed builder.
 *
 * Staleness test per document, all evidence from the current DB:
 *   - a fuel line whose ledger row (VENDOR, supplier, FUEL_EXPENSE, txn_id =
 *     trip, credit = amount, note = description) no longer exists; OR
 *   - a fuel line whose trip already carries an UNLOCK_REVERSAL on that
 *     supplier; OR
 *   - two fuel lines with the same (trip, description, amount).
 *
 * Idempotent: already-deleted documents are skipped, so a second --apply is a
 * no-op. Scope defaults to every non-deleted VENDOR PAYMENT_STATEMENT.
 *
 * Usage:
 *   npx tsx scripts/repair-stale-payment-statements.ts                 # dry-run
 *   npx tsx scripts/repair-stale-payment-statements.ts --apply
 *   npx tsx scripts/repair-stale-payment-statements.ts --document-id 35
 *   npx tsx scripts/repair-stale-payment-statements.ts --supplier-id 10
 */
import { and, eq, isNull } from 'drizzle-orm';
import { db, client } from '../src/db';
import * as s from '../src/db/schema';

const APPLY = process.argv.includes('--apply');

function flagValue(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const documentIdFlag = flagValue('document-id');
const supplierIdFlag = flagValue('supplier-id');
const documentId = documentIdFlag !== undefined ? Number(documentIdFlag) : null;
const supplierId = supplierIdFlag !== undefined ? Number(supplierIdFlag) : null;
if (documentId !== null && (!Number.isInteger(documentId) || documentId <= 0)) {
  console.error(`--document-id không hợp lệ: ${documentIdFlag}`);
  process.exit(1);
}
if (supplierId !== null && (!Number.isInteger(supplierId) || supplierId <= 0)) {
  console.error(`--supplier-id không hợp lệ: ${supplierIdFlag}`);
  process.exit(1);
}

interface FuelLine { id: number; sourceId: number | null; description: string; baseAmount: number }

async function main() {
  const filters = [
    eq(s.billingDocuments.type, 'PAYMENT_STATEMENT'),
    eq(s.billingDocuments.entityType, 'VENDOR'),
    isNull(s.billingDocuments.deletedAt),
  ];
  if (documentId !== null) filters.push(eq(s.billingDocuments.id, documentId));
  if (supplierId !== null) filters.push(eq(s.billingDocuments.entityId, supplierId));

  const docs = await db.select({
    id: s.billingDocuments.id,
    entityId: s.billingDocuments.entityId,
    rangeFrom: s.billingDocuments.rangeFrom,
    rangeTo: s.billingDocuments.rangeTo,
    createdAt: s.billingDocuments.createdAt,
    totalInclVat: s.billingDocuments.totalInclVat,
  }).from(s.billingDocuments).where(and(...filters)).orderBy(s.billingDocuments.id);

  console.log(`Chế độ: ${APPLY ? 'APPLY (ghi)' : 'DRY-RUN (chỉ đọc)'}`);
  console.log(`Bảng kê NCC cần rà: ${docs.length}`);
  if (docs.length === 0) {
    console.log('Không có gì để sửa.');
    return;
  }

  let staleDocs = 0;
  let linesBefore = 0;

  for (const doc of docs) {
    const lines = await db.select({
      id: s.billingDocumentLines.id,
      sourceId: s.billingDocumentLines.sourceId,
      description: s.billingDocumentLines.description,
      baseAmount: s.billingDocumentLines.baseAmount,
    }).from(s.billingDocumentLines)
      .where(eq(s.billingDocumentLines.documentId, doc.id));

    const fuelLines: FuelLine[] = lines
      .filter(l => (l.description ?? '').includes('lít dầu'))
      .map(l => ({
        id: l.id,
        sourceId: l.sourceId ?? null,
        description: l.description ?? '',
        baseAmount: Number(l.baseAmount),
      }));

    // Ledger facts for this supplier: the live charges and the reversals.
    const ledgerRows = await db.select({
      txnType: s.ledger.txnType,
      txnId: s.ledger.txnId,
      credit: s.ledger.credit,
      note: s.ledger.note,
    }).from(s.ledger)
      .where(and(eq(s.ledger.entityType, 'VENDOR'), eq(s.ledger.entityId, doc.entityId)));

    const liveChargeKeys = new Set<string>();
    const reversedTripIds = new Set<number>();
    for (const row of ledgerRows) {
      if (row.txnType === 'FUEL_EXPENSE') {
        liveChargeKeys.add(`${row.txnId}|${Number(row.credit).toFixed(0)}|${row.note ?? ''}`);
      } else if (row.txnType === 'UNLOCK_REVERSAL' && (row.note ?? '').startsWith('Chi phí')) {
        if (row.txnId != null) reversedTripIds.add(row.txnId);
      }
    }

    const orphaned = fuelLines.filter(l =>
      l.sourceId == null
      || !liveChargeKeys.has(`${l.sourceId}|${l.baseAmount.toFixed(0)}|${l.description}`),
    );
    const cancelled = fuelLines.filter(l => l.sourceId != null && reversedTripIds.has(l.sourceId));

    const groupCounts = new Map<string, number>();
    for (const l of fuelLines) {
      const key = `${l.sourceId}|${l.description}|${l.baseAmount}`;
      groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
    }
    let duplicateExtras = 0;
    for (const n of groupCounts.values()) if (n > 1) duplicateExtras += n - 1;

    const isStale = orphaned.length > 0 || cancelled.length > 0 || duplicateExtras > 0;
    linesBefore += lines.length;

    console.log(
      `\n#${doc.id} · NCC ${doc.entityId} · ${String(doc.rangeFrom).slice(0, 10)}..${String(doc.rangeTo).slice(0, 10)}`
      + ` · tạo ${new Date(doc.createdAt).toISOString().slice(0, 10)} · tổng ${Number(doc.totalInclVat).toLocaleString('vi-VN')}₫`,
    );
    console.log(
      `   dòng=${lines.length} · dòng dầu=${fuelLines.length}`
      + ` · không còn dòng sổ khớp=${orphaned.length}`
      + ` · bị hoàn tác=${cancelled.length}`
      + ` · dòng trùng (mô tả+số tiền)=${duplicateExtras}`
      + ` → ${isStale ? 'CẦN SỬA (xóa để tạo lại)' : 'giữ nguyên'}`,
    );
    if (isStale && fuelLines.length <= 3) {
      for (const l of fuelLines) {
        console.log(
          `     · #${l.id} ${l.description} = ${l.baseAmount.toLocaleString('vi-VN')}₫`
          + ` [trip ${l.sourceId ?? '—'}]`
          + (orphaned.some(o => o.id === l.id) ? ' (không khớp sổ)' : ''),
        );
      }
    }
    if (isStale && fuelLines.length > 3) {
      console.log(`     · ví dụ: ${fuelLines.slice(0, 3).map(l => `#${l.id} ${l.baseAmount.toLocaleString('vi-VN')}₫`).join(', ')} …`);
    }

    if (isStale) {
      staleDocs++;
      if (APPLY) {
        await db.update(s.billingDocuments)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(s.billingDocuments.id, doc.id));
        console.log(`     ĐÃ XÓA (mềm) #${doc.id} — kế toán tạo lại bảng kê từ sổ hiện tại.`);
      }
    }
  }

  console.log(`\nTổng kết: quét ${docs.length} bảng kê, ${staleDocs} bảng kê cần sửa, ${linesBefore} dòng trước khi sửa.`);
  if (!APPLY && staleDocs > 0) {
    console.log('Chưa ghi gì (dry-run). Chạy lại với --apply để xóa mềm các bảng kê trên, rồi bấm "Tạo bảng kê" lại trong trang công nợ.');
  }
  if (APPLY) {
    console.log(`Đã xóa mềm ${staleDocs} bảng kê; chạy lại chế độ dry-run sẽ thấy 0 bảng kê cần sửa (idempotent).`);
  }
}

main()
  .then(async () => { await client.end(); })
  .catch(async (err) => { console.error(err); await client.end(); process.exit(1); });
