import React from 'react';
import { Receipt, Plus } from 'lucide-react';
import { AncillaryFeesCard } from './AncillaryFeesCard';

interface TripDetailServiceCostsCardProps {
  tripId: number;
  readOnly: boolean;
}

export function TripDetailServiceCostsCard({ tripId, readOnly }: TripDetailServiceCostsCardProps) {
  return (
    <section className="card service-card anim d4">
      <div className="card-head">
        <div>
          <h2>
            <span className="hicon">
              <Receipt size={15} />
            </span>
            Chi phí dịch vụ đi kèm
          </h2>
          <p className="sub">Phí nâng/hạ, hải quan, cân hàng…</p>
        </div>
        {!readOnly && (
          <button className="btn btn-soft">
            <Plus size={14} />
            Thêm phí
          </button>
        )}
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        <AncillaryFeesCard tripId={tripId} readOnly={readOnly} />
      </div>
    </section>
  );
}
