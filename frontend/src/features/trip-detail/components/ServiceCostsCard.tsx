import React from 'react';
import { Receipt, Plus } from 'lucide-react';
import { AncillaryFeesCard } from '../../../components/trip/AncillaryFeesCard';

interface ServiceCostsCardProps {
  tripId: number;
  readOnly: boolean;
}

export function ServiceCostsCard({ tripId, readOnly }: ServiceCostsCardProps) {
  return (
    <section className="card service-card anim d4">
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ gap: '8px', margin: 0 }}>
            <span className="hicon" style={{ width: 24, height: 24 }}><Receipt size={14} /></span>
            Chi phí dịch vụ đi kèm
            <span className="sub" style={{ margin: 0, marginLeft: '4px', fontSize: '13px', fontWeight: 500, color: 'var(--ink-3)' }}>
              • Phí nâng/hạ, hải quan, cân hàng…
            </span>
          </h2>
        </div>
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        <AncillaryFeesCard tripId={tripId} readOnly={readOnly} />
      </div>
    </section>
  );
}
