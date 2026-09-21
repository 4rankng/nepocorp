import React from 'react';

/**
 * Layout for the inline config forms that open inside the CRUD modals.
 *
 * The fields sit in a wrapping row; the action block is a full-width footer
 * below them, so buttons never squeeze an input or land in a stray grid cell
 * (kanban 20260921_20).
 */
export function InlineForm({ children }: { colSpan?: number; children: React.ReactNode }) {
  return <div className="cfg-inline-form">{children}</div>;
}
