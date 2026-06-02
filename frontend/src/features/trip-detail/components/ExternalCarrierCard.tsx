import React from 'react';
import { User, Truck, Wallet, TrendingUp } from 'lucide-react';
import { fmtVND } from '../formatters';
import type { TripDerivedData } from '../types';

interface ExternalCarrierCardProps {
  derived: TripDerivedData;
  carrierName: string;
  plateNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  freightCost: number | null;
}

export function ExternalCarrierCard({
  derived, carrierName, plateNumber, driverName, driverPhone, freightCost,
}: ExternalCarrierCardProps) {
  const { externalMargin } = derived;

  return (
    <section className="card anim d4" style={{ marginBottom: 20 }}>
      <div className="card-head">
        <h2><span className="hicon"><Truck size={15} /></span>Xe ngoài</h2>
      </div>
      <div className="card-body">
        <div className="info-list">
          <div className="info-row">
            <span className="ri"><User size={17} /></span>
            <div className="info-meta">
              <div className="lbl">Đối tác vận chuyển</div>
              <div className="val">{carrierName}</div>
            </div>
          </div>
          <div className="info-row">
            <span className="ri"><Truck size={17} /></span>
            <div className="info-meta">
              <div className="lbl">Biển số xe</div>
              <div className="val mono">{plateNumber ?? '—'}</div>
            </div>
          </div>
          <div className="info-row">
            <span className="ri"><User size={17} /></span>
            <div className="info-meta">
              <div className="lbl">Lái xe</div>
              <div className="val">{driverName ?? '—'}{driverPhone ? ` (${driverPhone})` : ''}</div>
            </div>
          </div>
          <div className="info-row">
            <span className="ri"><Wallet size={17} /></span>
            <div className="info-meta">
              <div className="lbl">Cước thuê ngoài</div>
              <div className="val mono">{freightCost != null ? `${fmtVND(freightCost)} đ` : '—'}</div>
            </div>
          </div>
          {externalMargin !== null && (
            <div className="info-row">
              <span className="ri"><TrendingUp size={17} /></span>
              <div className="info-meta">
                <div className="lbl">Lãi điều xe ngoài</div>
                <div className="val" style={{ color: externalMargin >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 700 }}>
                  {externalMargin >= 0 ? '+' : ''}{fmtVND(externalMargin)} đ
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
