import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getAuthenticatedPhotoUrl } from '../../../lib/api';
import { PhotoViewer } from '../../../components/PhotoViewer';
import '../../../components/PhotoViewer.css';

interface PhotosCardProps {
  photoUrls: string[] | null;
}

export function PhotosCard({ photoUrls }: PhotosCardProps) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!photoUrls || photoUrls.length === 0) return null;

  const authUrls = photoUrls.map(u => getAuthenticatedPhotoUrl(u));

  return (
    <section className="card anim d6" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <h2><span className="hicon"><ImageIcon size={15} /></span>Ảnh chuyến đi</h2>
      </div>
      <div className="card-body">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 10,
        }}>
          {authUrls.map((url, i) => (
            <button key={i} type="button" onClick={() => setViewerIndex(i)}
              style={{
                display: 'block',
                aspectRatio: '4/3',
                borderRadius: 'var(--r-md, 14px)',
                overflow: 'hidden',
                border: '1px solid var(--line)',
                transition: '0.15s ease',
                padding: 0,
                background: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              <img src={url} alt={`Ảnh ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {viewerIndex !== null && (
        <PhotoViewer
          urls={authUrls}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </section>
  );
}
