import { Save, X, Loader2 } from 'lucide-react';

/**
 * Canonical action footer for config modals: full-width row, right-aligned,
 * separated from the fields by a hairline (kanban 20260921_20). Layout lives in
 * `.cfg-form-actions` (pages/config/config-page.css) so every config form matches.
 */
export function FormActions({ saving, onsave, oncancel, isedit }: {
  saving: boolean; onsave: () => void; oncancel: () => void; isedit: boolean;
}) {
  return (
    <div className="cfg-form-actions">
      <button className="btn btn--primary btn--sm" disabled={saving} onClick={onsave}>
        {saving ? <Loader2 size={12} className="spin" /> : <Save size={12} />}
        {isedit ? 'Cập nhật' : 'Thêm'}
      </button>
      <button className="btn btn--ghost btn--sm" onClick={oncancel}>
        <X size={12} /> Hủy
      </button>
    </div>
  );
}
