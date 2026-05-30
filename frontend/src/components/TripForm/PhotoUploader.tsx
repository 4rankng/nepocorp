import React, { useRef } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

export type PhotoType = "CONTAINER" | "SEAL" | "OTHER";

export interface TripFormPhoto {
  url: string;
  type: PhotoType;
}

interface PhotoUploaderProps {
  photos: TripFormPhoto[];
  onPhotosChange: (photos: TripFormPhoto[]) => void;
  requiresPhotos: boolean;
  uploading: boolean;
  onUpload: (files: FileList, type: PhotoType) => Promise<void>;
}

export function PhotoUploader({
  photos,
  onPhotosChange,
  requiresPhotos,
  uploading,
  onUpload,
}: PhotoUploaderProps) {
  const containerInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files, type);
      e.target.value = "";
    }
  };

  const removePhoto = (idx: number) => {
    const updated = photos.filter((_, i) => i !== idx);
    onPhotosChange(updated);
  };

  const containerPhotos = photos.filter((p) => p.type === "CONTAINER");
  const sealPhotos = photos.filter((p) => p.type === "SEAL");
  const otherPhotos = photos.filter((p) => p.type === "OTHER");

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <span className="typo-eyebrow">Xác thực chè & Ảnh đính kèm</span>
      </div>

      {requiresPhotos && (
        <div style={{
          padding: "10px 14px",
          background: "var(--warning-soft)",
          color: "var(--warning-text)",
          border: "1px solid rgba(217, 119, 6, 0.18)",
          borderRadius: "var(--radius-md)",
          fontSize: 12,
          marginBottom: 16,
          fontWeight: 600,
          lineHeight: 1.4,
        }}>
          ⚠️ Hàng chè yêu cầu đính kèm ảnh vỏ Container và Niêm phong (Seal) để hoàn thành chuyến đi.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Container slot */}
        <div style={{
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-md)",
          padding: 12,
          background: "var(--bg-1)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Ảnh vỏ Container</span>
            {requiresPhotos && containerPhotos.length === 0 && <span style={{ color: "var(--danger)", fontSize: 10 }}>Chưa có *</span>}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {containerPhotos.map((photo, i) => {
              const globalIdx = photos.findIndex((p) => p.url === photo.url);
              return (
                <div key={photo.url} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-1)", position: "relative", overflow: "hidden" }}>
                  <img src={photo.url} alt="Container" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => removePhoto(globalIdx)} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={8} />
                  </button>
                </div>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 48, border: "1px dashed var(--fg-3)", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", cursor: uploading ? "wait" : "pointer", color: "var(--fg-2)", fontSize: 12 }}>
            {uploading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Upload size={14} /> Thêm ảnh vỏ</span>
            )}
            <input type="file" ref={containerInputRef} style={{ display: "none" }} onChange={(e) => handleFileChange(e, "CONTAINER")} disabled={uploading} accept="image/*" />
          </label>
        </div>

        {/* Seal slot */}
        <div style={{
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-md)",
          padding: 12,
          background: "var(--bg-1)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Ảnh Niêm phong (Seal)</span>
            {requiresPhotos && sealPhotos.length === 0 && <span style={{ color: "var(--danger)", fontSize: 10 }}>Chưa có *</span>}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {sealPhotos.map((photo, i) => {
              const globalIdx = photos.findIndex((p) => p.url === photo.url);
              return (
                <div key={photo.url} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-1)", position: "relative", overflow: "hidden" }}>
                  <img src={photo.url} alt="Seal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => removePhoto(globalIdx)} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <X size={8} />
                  </button>
                </div>
              );
            })}
          </div>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 48, border: "1px dashed var(--fg-3)", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", cursor: uploading ? "wait" : "pointer", color: "var(--fg-2)", fontSize: 12 }}>
            {uploading ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Upload size={14} /> Thêm ảnh seal</span>
            )}
            <input type="file" ref={sealInputRef} style={{ display: "none" }} onChange={(e) => handleFileChange(e, "SEAL")} disabled={uploading} accept="image/*" />
          </label>
        </div>
      </div>

      {/* Other photos slot */}
      <div style={{
        border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-md)",
        padding: 12,
        background: "var(--bg-1)",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>
          Ảnh đính kèm khác
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {otherPhotos.map((photo, i) => {
            const globalIdx = photos.findIndex((p) => p.url === photo.url);
            return (
              <div key={photo.url} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-1)", position: "relative", overflow: "hidden" }}>
                <img src={photo.url} alt="Other" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => removePhoto(globalIdx)} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <X size={8} />
                </button>
              </div>
            );
          })}
        </div>

        <label style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 44, border: "1px dashed var(--fg-3)", borderRadius: "var(--radius-sm)", background: "var(--bg-2)", cursor: uploading ? "wait" : "pointer", color: "var(--fg-2)", fontSize: 12 }}>
          {uploading ? (
            <Loader2 size={16} className="spin" />
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Upload size={14} /> Tải ảnh khác lên</span>
          )}
          <input type="file" ref={otherInputRef} multiple style={{ display: "none" }} onChange={(e) => handleFileChange(e, "OTHER")} disabled={uploading} accept="image/*" />
        </label>
      </div>
    </div>
  );
}
