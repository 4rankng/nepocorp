import { useTripFormContext } from '../../hooks/useTripFormContext';
import './TripInstructionsCard.css';

/**
 * Manager-authored "Liên hệ & hướng dẫn" block (N2 / B1.3) — contact name,
 * contact phone, and free-text guidance for the driver.
 *
 * The fields are owned by the trip-form state and persisted by the unified
 * "Lưu cập nhật" submit (via PUT /api/trips/:id/instructions). This card is
 * purely the editor — no separate save button, no local GET, no loading state.
 * Removing the standalone save avoids the trap of a partially-saved trip
 * (figures saved, instructions not) after a network blip.
 *
 * On the create page the card is not mounted, so the three fields stay
 * empty; the upsert only runs in the edit-mode branch of handleSubmit.
 */
// B1c — one-tap reminder templates the manager can drop into the notes so
// drivers see consistent guidance (fumigation, weighing, seal, quarantine…).
const REMINDER_TEMPLATES = [
  'Lưu ý hun trùng',
  'Lưu ý cân hàng',
  'Lưu ý kẹp seal tạm',
  'Lưu ý lấy mẫu kiểm dịch',
  'Giao ngoài giờ hành chính',
  'Cẩn thận hàng giá trị cao',
];

export function TripInstructionsCard() {
  const { contactName, setContactName, contactPhone, setContactPhone,
    instructionsNotes, setInstructionsNotes } = useTripFormContext();

  // Append a templated reminder as a bullet line; skip if already present.
  function appendReminder(label: string) {
    if (instructionsNotes.includes(label)) return;
    const line = `• ${label}`;
    setInstructionsNotes(instructionsNotes.trim() ? `${instructionsNotes.trimEnd()}\n${line}` : line);
  }

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
            onChange={e => setContactName(e.target.value)}
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
            onChange={e => setContactPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="ti-field">
        <label className="ti-label">Ghi chú hướng dẫn</label>
        <textarea
          className="input ti-textarea"
          placeholder="Hướng dẫn cho lái xe: giờ giao, địa chỉ cụ thể, lưu ý bốc xếp…"
          value={instructionsNotes}
          onChange={e => setInstructionsNotes(e.target.value)}
        />
      </div>
      <div className="ti-reminders">
        <span className="ti-reminders__label">Mẫu nhanh:</span>
        {REMINDER_TEMPLATES.map(t => (
          <button key={t} type="button" className="ti-chip" onClick={() => appendReminder(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="ti-hint">Lưu cùng nút "Lưu cập nhật" ở dưới.</div>
    </div>
  );
}
