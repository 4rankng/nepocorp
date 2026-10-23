import React, { useEffect, useRef } from 'react';
import type { LedgerCellContext, LedgerCellPatch } from './ledgerColumns';
import type { LedgerRow } from '@tingting/shared';

interface LedgerCellInputProps {
  draft: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: Array<{ value: string; label: string }>;
  onChange: (draft: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

function LedgerCellInput({ draft, type, options, onChange, onCommit, onCancel }: LedgerCellInputProps) {
  const ref = useRef<HTMLInputElement | HTMLSelectElement>(null);
  // Focus + select on mount, and make sure the sticky header/footer bands do
  // not cover the editor (guideline: overlays must not hide the focused element).
  useEffect(() => {
    ref.current?.focus();
    (ref.current as HTMLInputElement)?.select?.();
    ref.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  if (type === 'select') {
    return (
      <select
        ref={ref as React.RefObject<HTMLSelectElement>}
        className="ledger-cell__input"
        value={draft}
        aria-label="Chọn giá trị"
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onBlur={onCommit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit();
          if (e.key === 'Escape') onCancel();
        }}
      >
        {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      className="ledger-cell__input"
      type={type}
      value={draft}
      inputMode={type === 'number' ? 'numeric' : undefined}
      spellCheck={false}
      autoComplete="off"
      aria-label={type === 'number' ? 'Nhập số' : 'Nhập giá trị'}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit();
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
}

/** One grid cell: quiet text by default, hover pencil affordance, single
 *  inline input overlay when editing. */
export function LedgerCell(props: {
  row: LedgerRow;
  colId: string;
  ctx: LedgerCellContext;
  editable: boolean;
  editType?: 'text' | 'number' | 'date' | 'select';
  /** Options for editType 'select' (e.g. khách hàng). */
  options?: Array<{ value: string; label: string }>;
  /** Raw value the input starts from when editing starts. */
  rawValue?: string;
  /** Formatted read-only display. */
  display: React.ReactNode;
  buildPatch?: (row: LedgerRow, draft: string) => LedgerCellPatch | null;
  /** Why the cell is not editable (tooltip on the locked affordance). */
  lockedTitle?: string;
  title?: string;
  /** Progressive-entry hint shown in an empty editable cell ("+ Nhập cước") —
   *  marks what is missing without blocking, per the sổ cái requirement. */
  hint?: string;
}) {
  const { row, colId, ctx, editable, editType = 'text', options, rawValue = '', display, buildPatch, lockedTitle, title, hint } = props;
  const key = `${row.id}:${colId}`;
  const isEditing = ctx.editing?.key === key;
  const isSaving = ctx.savingKey === key;
  const showHint = editable && hint != null && rawValue === '';

  if (!editable && !isEditing) {
    return (
      <span className="ledger-cell ledger-cell--locked" title={lockedTitle ?? title}>
        {display}
      </span>
    );
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        className={`ledger-cell ledger-cell--editable${showHint ? ' ledger-cell--hint' : ''}`}
        title={title}
        onClick={() => ctx.onStartEdit(row.id, colId, rawValue)}
      >
        {showHint ? hint : display}
      </button>
    );
  }

  // Enter fires commit; the unmount-blur that follows must not commit again
  // with an already-cleared draft (the double PATCH wrote 0 over the value).
  let committed = false;
  const commit = () => {
    if (committed || !buildPatch) {
      if (committed) return;
      ctx.onCancelEdit();
      return;
    }
    committed = true;
    // Capture the draft once — ctx.editing may already be cleared by the time
    // a second event (blur) reaches this closure.
    const draft = ctx.editing?.draft ?? '';
    const patch = buildPatch(row, draft);
    if (!patch) {
      ctx.onCancelEdit();
      return;
    }
    const error = ctx.onCommit(row, colId, patch, draft);
    if (error) return; // keep the editor open with the error shown by the page
  };

  return (
    <span className={`ledger-cell ledger-cell--editing${isSaving ? ' ledger-cell--saving' : ''}`}>
      <LedgerCellInput
        draft={ctx.editing?.draft ?? ''}
        type={editType}
        options={options}
        onChange={ctx.onDraftChange}
        onCommit={commit}
        onCancel={ctx.onCancelEdit}
      />
    </span>
  );
}
