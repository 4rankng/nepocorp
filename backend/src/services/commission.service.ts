import { db } from '../db';
import { LedgerService } from './ledger.service';
import { TxnType, round2dp } from '@tingting/shared';
import type { CommissionInput } from '@tingting/shared';

/**
 * Record a manual commission payable owed to a supplier.
 *
 * Posts a single COMMISSION ledger row on the supplier's VENDOR ledger:
 * credit = amount (increases the supplier's payable balance per the
 * VENDOR sign convention in LedgerService.postEntry).
 *
 * Not trip-scoped — `tripId` is passed through as optional `txnId` context.
 */
export async function recordCommission(input: CommissionInput): Promise<{ ok: true }> {
  await db.transaction(async (tx) => {
    await LedgerService.postEntry(tx, {
      txnType: TxnType.COMMISSION,
      txnId: input.tripId,
      entityType: 'VENDOR',
      entityId: input.supplierId,
      debit: 0,
      credit: round2dp(Number(input.amount)),
      note: input.note?.trim() || 'Hoa hồng',
    });
  });
  return { ok: true };
}
