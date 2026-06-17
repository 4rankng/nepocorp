import { db } from '../db';
import * as s from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { Role } from '@tingting/shared';

/**
 * Ownership-scoped authorization for receipt photos served under the AMBIGUOUS
 * `expense-photos/<id>/` storage prefix.
 *
 * The prefix is shared by two independent serial sequences:
 *   - company receipts   → expense_photos        (keyed by expenses.id)
 *   - forwarder receipts → trip_expense_photos   (keyed by trip_expenses.id)
 * These sequences can collide numerically, so a request CANNOT be authorized by
 * parsing the id from the path. This helper resolves the domain by EXACT
 * `storage_key` match against BOTH tables, then applies STRICTEST-MATCH: access
 * is granted only if the caller is authorized under EVERY table that holds the
 * key. (A full-key collision is near-impossible — keys embed Date.now()+ext —
 * but strictest-match is correct regardless and fail-closes on collision.)
 *
 * The requester's ACTIVE status is re-validated here for FORWARDER because the
 * `/api/photos` router sits behind `assetAuthMiddleware` (JWT sig + jti only),
 * NOT `resolveForwarder` — so a disabled forwarder with an unexpired JWT would
 * otherwise still read photos (ADR 0042, N5).
 *
 * Pure (no req/res) for unit-testability. Callers map decisions to HTTP:
 *   allow      → sendFile
 *   forbidden  → 403
 *   collision  → 403 (+ logger.warn — a both-tables match is a write-path
 *                integrity signal, not normal traffic)
 *   not_found  → 404
 */
export type PhotoAuthzReason = 'forbidden' | 'collision' | 'not_found';
export interface PhotoAuthDecision {
  allow: boolean;
  reason: PhotoAuthzReason;
}

const FINANCE_ROLES: ReadonlySet<Role> = new Set([Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT]);

/** Single indexed PK probe; closes the disabled-forwarder JWT window (N5). */
async function isUserActive(userId: number): Promise<boolean> {
  const [row] = await db.select({ id: s.users.id })
    .from(s.users)
    .where(and(eq(s.users.id, userId), eq(s.users.status, 'ACTIVE')))
    .limit(1);
  return !!row;
}

export async function authorizeExpensePhoto(
  storageKey: string,
  user: { userId: number; role: Role },
): Promise<PhotoAuthDecision> {
  // 1. Parallel exact-storage_key lookups against both receipt tables.
  const [tripRows, expenseRows] = await Promise.all([
    db.select({ forwarderId: s.tripExpenses.forwarderId })
      .from(s.tripExpensePhotos)
      .innerJoin(s.tripExpenses, eq(s.tripExpensePhotos.tripExpenseId, s.tripExpenses.id))
      .where(eq(s.tripExpensePhotos.storageKey, storageKey))
      .limit(1),
    db.select({ id: s.expensePhotos.id })
      .from(s.expensePhotos)
      .where(eq(s.expensePhotos.storageKey, storageKey))
      .limit(1),
  ]);

  const tripMatch = tripRows.length > 0;
  const expenseMatch = expenseRows.length > 0;
  if (!tripMatch && !expenseMatch) return { allow: false, reason: 'not_found' };

  // 2. Per-table authorization.
  const authzTrip = async (): Promise<boolean> => {
    if (FINANCE_ROLES.has(user.role)) return true;
    if (user.role === Role.FORWARDER) {
      // forwarderId is NULLABLE (accountants also create trip_expenses);
      // null !== userId denies naturally. Re-validate ACTIVE (N5).
      const owner = tripRows[0].forwarderId;
      return owner != null && owner === user.userId && await isUserActive(user.userId);
    }
    return false; // DRIVER
  };
  const authzExpense = (): boolean => FINANCE_ROLES.has(user.role);

  // 3. STRICTEST-MATCH: allow only if authorized under every matching table.
  const okTrip = !tripMatch || await authzTrip();
  const okExpense = !expenseMatch || authzExpense();
  const allow = okTrip && okExpense;

  if (!allow && tripMatch && expenseMatch) return { allow: false, reason: 'collision' };
  return { allow, reason: 'forbidden' };
}
