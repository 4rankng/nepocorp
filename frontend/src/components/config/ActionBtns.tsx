import { Pencil, Trash2, Loader2 } from 'lucide-react';

export function ActionBtns({ id, deleting, onedit, ondelete }: {
  id: number; deleting: number | null; onedit: () => void; ondelete: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn btn--ghost btn--sm btn--icon" title="Sửa" onClick={onedit}><Pencil size={13} /></button>
      <button className="btn btn--ghost btn--sm btn--icon" title="Xóa" disabled={deleting === id} onClick={ondelete}>
        {deleting === id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} style={{ color: 'var(--danger)' }} />}
      </button>
    </div>
  );
}
