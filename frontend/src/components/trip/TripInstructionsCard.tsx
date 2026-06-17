import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { tripClient } from '../../api/tripClient';
import { ApiError } from '../../lib/api';
import './TripInstructionsCard.css';

interface Props {
  tripId: number;
}

/**
 * Manager-authored "Liên hệ & hướng dẫn" block (N2 / B1.3). Loads the existing
 * instructions row, lets the manager edit contact name/phone + free-text
 * guidance, and saves via a dedicated PUT (separate from the main trip save)
 * so a failure here never blocks the trip figures save.
 */
export function TripInstructionsCard({ tripId }: Props) {
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  // True when the initial GET failed — blocks Save so the manager can't
  // overwrite existing instructions they couldn't see. Cleared only by a
  // successful reload, not by editing.
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    tripClient.getTripInstructions(tripId)
      .then(row => {
        if (cancelled) return;
        setContactName(row?.contactName ?? '');
        setContactPhone(row?.contactPhone ?? '');
        setNotes(row?.notes ?? '');
        setLoadFailed(false);
      })
      .catch(() => {
        // Don't silently show blank fields — an existing row we failed to load
        // must not be overwritten. Flag the failure so Save is blocked until a
        // successful reload.
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tripId]);

  // Clear the stale success badge (and any prior save error) the moment the
  // manager edits a field, so "Đã lưu hướng dẫn" never sits next to unsaved input.
  const markDirty = () => {
    setSavedAt(null);
    setError(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await tripClient.upsertTripInstructions(tripId, {
        contactName: contactName.trim() || null,
        contactPhone: contactPhone.trim() || null,
        notes: notes.trim() || null,
      });
      setSavedAt(Date.now());
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Không lưu được hướng dẫn');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ti-card">
      <div className="ti-row">
        <div className="ti-field">
          <label className="ti-label">Liên hệ</label>
          <input
            className="input"
            type="text"
            maxLength={100}
            placeholder="Tên người liên hệ tại điểm giao/nhận"
            value={contactName}
            onChange={e => { setContactName(e.target.value); markDirty(); }}
            disabled={loading || saving}
          />
        </div>
        <div className="ti-field ti-field--phone">
          <label className="ti-label">SĐT liên hệ</label>
          <input
            className="input"
            type="tel"
            maxLength={20}
            placeholder="0xxx xxx xxx"
            value={contactPhone}
            onChange={e => { setContactPhone(e.target.value); markDirty(); }}
            disabled={loading || saving}
          />
        </div>
      </div>
      <div className="ti-field">
        <label className="ti-label">Ghi chú hướng dẫn</label>
        <textarea
          className="input ti-textarea"
          placeholder="Hướng dẫn cho lái xe: giờ giao, địa chỉ cụ thể, lưu ý bốc xếp…"
          value={notes}
          onChange={e => { setNotes(e.target.value); markDirty(); }}
          disabled={loading || saving}
        />
      </div>
      <div className="ti-actions">
        <button
          type="button"
          className="btn btn--secondary ti-save-btn"
          onClick={handleSave}
          disabled={loading || saving || loadFailed}
        >
          {saving ? <><Loader2 size={16} className="spin" /> Đang lưu…</> : <><Save size={16} /> Lưu hướng dẫn</>}
        </button>
        {savedAt && !error && !loadFailed && <span className="ti-saved-ok">Đã lưu hướng dẫn</span>}
        {error && <span className="ti-saved-err">{error}</span>}
        {loadFailed && <span className="ti-saved-err">Không tải được hướng dẫn hiện có — tải lại trang để tránh ghi đè.</span>}
      </div>
    </div>
  );
}
