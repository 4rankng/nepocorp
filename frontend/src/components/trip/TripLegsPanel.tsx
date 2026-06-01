interface TripLeg {
  id: number;
  sequence: number;
  origin: string;
  destination: string;
  km: number;
  loadingType: string;
}

interface TripLegsPanelProps {
  legs: TripLeg[];
  emptyMessage?: string;
}

function loadingTypeLabel(t: string) {
  if (t === 'HANG') return 'Có hàng';
  if (t === 'VO') return 'Vỏ rỗng';
  return t;
}

export default function TripLegsPanel({ legs, emptyMessage = 'Chưa có thông tin hành trình' }: TripLegsPanelProps) {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div style={{ padding: '4px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Hành trình chi tiết {legs.length > 0 && `(${legs.length} chặng)`}
        </span>
      </div>
      {legs.length === 0 ? (
        <div style={{ padding: '16px 20px', color: 'var(--fg-3)', fontSize: 13, textAlign: 'center' }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ padding: '8px 20px' }}>
          {legs.map((leg, idx) => (
            <div key={leg.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '10px 0',
              borderBottom: idx < legs.length - 1 ? '1px solid var(--border-1)' : 'none',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--brand-soft)', color: 'var(--brand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 2,
              }}>
                {leg.sequence}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-1)' }}>
                  {leg.origin} → {leg.destination}
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 3, display: 'flex', gap: 12 }}>
                  <span>{leg.km} km</span>
                  <span style={{
                    padding: '1px 8px', borderRadius: 20,
                    background: leg.loadingType === 'HANG' ? 'var(--brand-soft)' : 'var(--bg-2)',
                    color: leg.loadingType === 'HANG' ? 'var(--brand)' : 'var(--fg-3)',
                    fontSize: 11, fontWeight: 600,
                  }}>
                    {loadingTypeLabel(leg.loadingType)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
