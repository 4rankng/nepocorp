import React from 'react';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { CardSection } from './CardSection';

interface ImagesNotesCardProps {
  notes: string;
  onNotesChange: (v: string) => void;
  photoUrls: string[];
  uploading: boolean;
  onUpload: (files: FileList) => Promise<void>;
  onRemovePhoto: (idx: number) => void;
  /** Render as a click-to-expand section (used on the create-trip flow where this is optional). */
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function ImagesNotesCard({ notes, onNotesChange, photoUrls, uploading, onUpload, onRemovePhoto, collapsible, defaultCollapsed }: ImagesNotesCardProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <CardSection
      number={4}
      title="Hình ảnh & ghi chú"
      subtitle="Ảnh đính kèm và lưu ý chuyến đi"
      badge="optional"
      collapsible={collapsible}
      defaultCollapsed={defaultCollapsed}
    >
      <div className="tc-form-row tc-form-row--split-3-2">
        <div className="field">
          <label>Ghi chú chuyến đi</label>
          <textarea
            className="input"
            style={{ minHeight: 140, resize: 'vertical' }}
            rows={7}
            placeholder="Ghi chú chi tiết chuyến đi, các lưu ý đặc biệt, yêu cầu của khách hàng…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Ảnh đính kèm</label>
          {photoUrls.length > 0 && (
            <div className="photo-grid">
              {photoUrls.map((url, i) => (
                <div key={i} className="photo-thumb">
                  <img src={url} alt={`Preview ${i + 1}`} />
                  <button type="button" className="photo-thumb__remove" onClick={() => onRemovePhoto(i)}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="tc-upload-zone" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
            {uploading ? (
              <div style={{ padding: '20px 0' }}>
                <Loader2 size={24} className="spin" style={{ color: 'var(--accent)' }} />
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--fg-2)' }}>Đang tải lên…</div>
              </div>
            ) : (
              <>
                <div className="tc-upload-zone__ico">
                  <Upload size={22} />
                </div>
                <div className="tc-upload-zone__main">Kéo & thả ảnh vào đây</div>
                <div className="tc-upload-zone__sub">hoặc bấm để chọn từ máy</div>
                <div className="tc-upload-zone__formats">PNG, JPG, HEIC · tối đa 10 ảnh</div>
              </>
            )}
            <input type="file" multiple accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
          </label>
        </div>
      </div>
    </CardSection>
  );
}
