import type { LedgerRow } from '@tingting/shared';

// ─── Cell patch descriptors ──────────────────────────────────────────────────
// Every editable ledger column describes which group endpoint its save goes
// through; the page executes the PATCH and repaints the row from the response.
// These types live in their own module so ledgerColumns ↔ LedgerEditableCell
// stay a one-way import (no render-cycle pair).

export type LedgerCellPatch =
  | { kind: 'plan'; body: Record<string, unknown> }
  | { kind: 'money'; body: Record<string, unknown> }
  | { kind: 'expense'; expenseId: number; body: Record<string, unknown> };

export interface LedgerCellContext {
  canPlan: boolean;
  canMoney: boolean;
  /** Catalog options for select-type cells (khách hàng). */
  customerOptions: Array<{ value: string; label: string }>;
  /** Currently-editing cell (rowId:colId) with its draft value. */
  editing: { key: string; draft: string } | null;
  savingKey: string | null;
  /** Expand/collapse the per-container cross-check panel of a row. */
  onToggleExpand(rowId: number): void;
  onStartEdit(rowId: number, colId: string, initial: string): void;
  onDraftChange(draft: string): void;
  /** Commit; returns an error message or null. */
  onCommit(row: LedgerRow, colId: string, patch: LedgerCellPatch, draft: string): string | null;
  onCancelEdit(): void;
}
