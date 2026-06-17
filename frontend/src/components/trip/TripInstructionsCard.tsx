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
export function TripInstructionsCard() {
  const { contactName, setContactName, contactPhone, setContactPhone,
    instructionsNotes, setInstructionsNotes } = useTripFormContext();

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
      <div className="ti-hint">Lưu cùng nút "Lưu cập nhật" ở dưới.</div>
    </div>
  );
}
