import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface PhotosCardProps {
  photoUrls: string[] | null;
}

export function PhotosCard({ photoUrls }: PhotosCardProps) {
  if (!photoUrls || photoUrls.length === 0) return null;

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
          {photoUrls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'block',
                aspectRatio: '4/3',
                borderRadius: 'var(--r-md, 14px)',
                overflow: 'hidden',
                border: '1px solid var(--line)',
                transition: '0.15s ease',
              }}
            >
              <img src={url} alt={`Ảnh ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
