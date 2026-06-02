import * as s from '../db/schema';
import { eq } from 'drizzle-orm';

export type ApprovableTable = 'trip_expenses' | 'debt_offsets';
export type ApprovalTransition = 'APPROVED' | 'REJECTED';

const APPROVABLE_TABLES = {
  trip_expenses: s.tripExpenses,
  debt_offsets:  s.debtOffsets,
} as const;

/**
 * Transitions an approvable record from PENDING → APPROVED or REJECTED.
 * Must be called inside a db.transaction().
 * Only MANAGER and ADMIN may approve.
 */
export async function transitionApproval(
  tx: any,
  opts: {
    table: ApprovableTable;
    id: number;
    toStatus: ApprovalTransition;
    actorId: number;
    actorRole: string;
  },
): Promise<void> {
  if (!['ADMIN', 'MANAGER'].includes(opts.actorRole)) {
    throw Object.assign(new Error('Chỉ quản lý mới có thể phê duyệt hoặc từ chối'), { status: 403 });
  }

  const table = APPROVABLE_TABLES[opts.table];

  const [record] = await tx
    .select({ id: table.id, approvalStatus: table.approvalStatus })
    .from(table)
    .where(eq(table.id, opts.id))
    .limit(1);

  if (!record) {
    throw Object.assign(new Error('Không tìm thấy bản ghi'), { status: 404 });
  }
  if (record.approvalStatus !== 'PENDING') {
    throw Object.assign(
      new Error(`Không thể chuyển trạng thái: bản ghi đang ở ${record.approvalStatus}`),
      { status: 400 },
    );
  }

  // trip_expenses has updatedAt; debt_offsets does not
  const patch: Record<string, unknown> = { approvalStatus: opts.toStatus };
  if (opts.table === 'trip_expenses') patch.updatedAt = new Date();

  await tx.update(table).set(patch).where(eq(table.id, opts.id));
}
