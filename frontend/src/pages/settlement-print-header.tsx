import { ArrowLeft, Printer, FileSpreadsheet, CheckCircle2, XCircle, Trash2, Loader2 } from 'lucide-react';
import { ADVANCE_SETTLEMENT_STATUS_LABELS, type AdvanceSettlementStatus } from '@tingting/shared';
import { StatusPill } from '../components/UI';
import { advanceSettlementStatusVariant } from '../lib/status-variants';

/**
 * The sheet's action bar, lifted out of SettlementPrintPage.tsx to keep that
 * page inside the file-size budget. Pure presentation: the page owns every
 * handler and the busy flags.
 *
 * Colour hierarchy is deliberate. Six same-weight buttons in a row read as one
 * undifferentiated block and the colours fight: a filled green "In" sat next to
 * the filled green "Duyệt" (two primaries) and two saturated reds sat side by
 * side (two destructives). So the utilities are neutral, the decisions sit
 * behind a hairline, and the bar keeps exactly one filled green (the decision,
 * rightmost where the eye ends) and one filled red (Từ chối), with Xóa phiếu
 * demoted to an outline.
 */
export function SettlementHeaderActions({
  code,
  status,
  maySignOff,
  mayDelete,
  busy,
  onBack,
  onPreview,
  onExport,
  onApprove,
  onReject,
  onDelete,
}: {
  code: string;
  status: AdvanceSettlementStatus;
  maySignOff: boolean;
  mayDelete: boolean;
  busy: { approving: boolean; rejecting: boolean; deleting: boolean; saving: boolean };
  onBack: () => void;
  onPreview: () => void;
  onExport: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const signOffBusy = busy.approving || busy.rejecting;

  return (
    <div className="settlement-detail__header-actions">
      <StatusPill variant={advanceSettlementStatusVariant(status)}>
        {ADVANCE_SETTLEMENT_STATUS_LABELS[status] || status}
      </StatusPill>

      <div className="settlement-detail__header-tools">
        <button className="btn btn--secondary btn--sm" onClick={onBack}>
          <ArrowLeft size={14} /> Trở về
        </button>
        <button className="btn btn--secondary btn--sm" onClick={onPreview}>
          <Printer size={14} /> In
        </button>
        <button className="btn btn--secondary btn--sm" onClick={onExport}>
          <FileSpreadsheet size={14} /> Excel
        </button>
      </div>

      {(maySignOff || mayDelete) && (
        <div className="settlement-detail__header-decisions">
          {maySignOff && (
            <button
              className="btn btn--danger btn--sm"
              disabled={signOffBusy}
              onClick={onReject}
            >
              {busy.rejecting ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />} Từ chối
            </button>
          )}
          {mayDelete && (
            <button
              className="btn btn--sm settlement-detail__quiet-danger"
              disabled={busy.deleting || busy.saving || busy.approving}
              onClick={onDelete}
              aria-label={`Xóa phiếu hoàn ứng ${code}`}
            >
              {busy.deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />} Xóa phiếu
            </button>
          )}
          {maySignOff && (
            <button
              className="btn btn--primary btn--sm"
              disabled={signOffBusy}
              onClick={onApprove}
            >
              {busy.approving ? <Loader2 size={14} className="spin" /> : <CheckCircle2 size={14} />} Duyệt
            </button>
          )}
        </div>
      )}
    </div>
  );
}
