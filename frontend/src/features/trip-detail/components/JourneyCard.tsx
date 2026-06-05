import React from 'react';
import { Route, Ruler, Image as ImageIcon, Plus, ArrowRight, Fuel } from 'lucide-react';
import type { TripDetail } from '@tingting/shared';
import { LoadingType } from '@tingting/shared';
import { LeafletMap } from '../../../components/shared/LeafletMap';
import type { TripDerivedData } from '../types';

interface JourneyCardProps {
  trip: TripDetail;
  derived: TripDerivedData;
}

export function JourneyCard({ trip, derived }: JourneyCardProps) {
  const { totalKm } = derived;
  const hasPolyline = trip.legs?.some(leg => leg.polylinePath);
  const legCount = trip.legs?.length ?? 0;

  return (
    <section className="card journey-card anim d5" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ gap: '8px', margin: 0 }}>
            <span className="hicon" style={{ width: 24, height: 24 }}><Route size={14} /></span>
            Hành trình
            <span className="sub" style={{ margin: 0, marginLeft: '4px', fontSize: '13px', fontWeight: 500, color: 'var(--ink-3)' }}>
              • {legCount} chặng đường
            </span>
          </h2>
        </div>
        <div className="journey-pills">
          <span className="jp jp--km">
            <Ruler size={13} />
            <span className="mono">{totalKm.toLocaleString('vi-VN')} km</span> tổng
          </span>
        </div>
      </div>

      <div className="journey-body">
        {hasPolyline && (
          <div className="map-wrap">
            <LeafletMap legs={trip.legs} height="100%" />
          </div>
        )}

        <div className="legs">
          {trip.legs?.map((leg, index) => (
            <div className="leg" key={leg.id ?? index}>
              <span className="leg-no">{leg.sequence ?? index + 1}</span>
              <div className="leg-route">
                <div className="leg-stops">
                  <span className="st">{leg.origin}</span>
                  <span className="ar"><ArrowRight size={14} /></span>
                  <span className="st">{leg.destination}</span>
                </div>
                <div className="leg-meta">
                  <span><Ruler size={13} /><span className="mono">{Number(leg.km).toLocaleString('vi-VN')} km</span></span>
                  <span><Fuel size={13} /><span className="mono">{leg.calculatedLiters ? `${Number(leg.calculatedLiters).toLocaleString('vi-VN')} L` : '—'}</span></span>
                </div>
              </div>
              <div className="leg-right">
                <span className={`badge ${leg.loadingType === LoadingType.HANG ? 'badge--load' : 'badge--empty'}`}>
                  {leg.loadingType === LoadingType.HANG ? 'CÓ HÀNG' : 'CHẠY VỎ'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="journey-foot">
        <ImageIcon size={15} />
        Chưa có ảnh hoặc ghi chú cho chuyến này.
        <span className="add-note">
          <Plus size={13} />
          Thêm ảnh / ghi chú
        </span>
      </div>
    </section>
  );
}
