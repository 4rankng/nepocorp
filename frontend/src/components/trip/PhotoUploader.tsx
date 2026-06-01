import React, { useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useTripFormContext } from "../../hooks/useTripFormContext";
import { getAuthenticatedPhotoUrl } from "../../lib/api";

export type PhotoType = "CONTAINER" | "SEAL" | "OTHER";

export interface TripFormPhoto {
  url: string;
  type: PhotoType;
}

interface PhotoUploaderProps {
  requiresPhotos: boolean;
  tripId?: number;
}

function mapUrlsToPhotos(urls: string[]): TripFormPhoto[] {
  return urls.map(url => {
    let type: PhotoType = 'OTHER';
    const decoded = decodeURIComponent(url.toLowerCase());
    if (decoded.includes('/container-') || decoded.includes('%2fcontainer-')) {
      type = 'CONTAINER';
    } else if (decoded.includes('/seal-') || decoded.includes('%2fseal-')) {
      type = 'SEAL';
    }
    return { url, type };
  });
}

export function PhotoUploader({ requiresPhotos, tripId }: PhotoUploaderProps) {
  const form = useTripFormContext();
  const { photoUrls, uploadPhotos, removePhoto, uploading } = form;

  const containerInputRef = useRef<HTMLInputElement>(null);
  const sealInputRef = useRef<HTMLInputElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);

  const photos = mapUrlsToPhotos(photoUrls);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadPhotos(e.target.files, tripId, type);
      e.target.value = "";
    }
  };

  const handleRemovePhoto = (idx: number) => {
    removePhoto(idx);
  };

  const containerPhotos = photos.filter((p) => p.type === "CONTAINER");
  const sealPhotos = photos.filter((p) => p.type === "SEAL");
  const otherPhotos = photos.filter((p) => p.type === "OTHER");

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <span className="typo-eyebrow">Xác thực chứng từ & Ảnh đính kèm</span>
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
          ⚠️ Loại hàng này yêu cầu đính kèm ảnh vỏ Container và Niêm phong (Seal) để hoàn thành chuyến đi.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          background: "var(--bg-1)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Ảnh vỏ Container</span>
            {requiresPhotos && containerPhotos.length === 0 && <span style={{ color: "var(--danger)", fontSize: 10 }}>Chưa có *</span>}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            {containerPhotos.map((photo) => {
              const globalIdx = photos.findIndex((p) => p.url === photo.url);
              return (
                <div key={photo.url} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-1)", position: "relative", overflow: "hidden" }}>
                  <img src={getAuthenticatedPhotoUrl(photo.url)} alt="Container" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => handleRemovePhoto(globalIdx)} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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

        <div style={{
          border: "1px solid var(--border-2)",
          borderRadius: "var(--radius-md)",
          padding: 14,
          background: "var(--bg-1)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
            <span>Ảnh Niêm phong (Seal)</span>
            {requiresPhotos && sealPhotos.length === 0 && <span style={{ color: "var(--danger)", fontSize: 10 }}>Chưa có *</span>}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
            {sealPhotos.map((photo) => {
              const globalIdx = photos.findIndex((p) => p.url === photo.url);
              return (
                <div key={photo.url} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-1)", position: "relative", overflow: "hidden" }}>
                  <img src={getAuthenticatedPhotoUrl(photo.url)} alt="Seal" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button type="button" onClick={() => handleRemovePhoto(globalIdx)} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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

      <div style={{
        border: "1px solid var(--border-2)",
        borderRadius: "var(--radius-md)",
        padding: 14,
        background: "var(--bg-1)",
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>
          Ảnh đính kèm khác
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
          {otherPhotos.map((photo) => {
            const globalIdx = photos.findIndex((p) => p.url === photo.url);
            return (
              <div key={photo.url} style={{ width: 64, height: 64, borderRadius: "var(--radius-sm)", border: "1px solid var(--border-1)", position: "relative", overflow: "hidden" }}>
                <img src={getAuthenticatedPhotoUrl(photo.url)} alt="Other" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button type="button" onClick={() => handleRemovePhoto(globalIdx)} style={{ position: "absolute", top: 2, right: 2, width: 16, height: 16, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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
