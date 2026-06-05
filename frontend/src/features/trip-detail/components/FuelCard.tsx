import React from 'react';
import { Fuel, AlertTriangle } from 'lucide-react';
import { FUEL_MODE_LABELS } from '@tingting/shared';
import { fmtVND } from '../formatters';
import type { TripDetail } from '@tingting/shared';
import type { TripDerivedData } from '../types';

interface FuelCardProps {
  trip: TripDetail;
  derived: TripDerivedData;
  fuelPriceConfig: number | null;
}

export function FuelCard({ trip, derived, fuelPriceConfig }: FuelCardProps) {
  const { fuelLiters, computedLiters, ttbq, fuelVarianceLiters, fuelVarianceOver } = derived;

  return (
    <div className="card">
      <div className="card-head">
        <h2><span className="hicon"><Fuel size={15} /></span>Nhiên liệu</h2>
      </div>
      <div className="card-body">
        <div className="fuel-list">
          <div className="pl-row">
            <span className="k">Chế độ tính</span>
            <span className="v">{FUEL_MODE_LABELS[trip.fuelMode]}</span>
          </div>
          <div className="pl-row">
            <span className="k">Đơn giá cấu hình</span>
            <span className="v">{fuelPriceConfig != null ? `${fmtVND(fuelPriceConfig)} đ/lít` : '—'}</span>
          </div>
          <div className="pl-row">
            <span className="k">Tiêu thụ bình quân</span>
            <span className="v">{ttbq > 0 ? `${ttbq.toFixed(1)} L/100km` : '—'}</span>
          </div>
          {trip.fuelSupplier && (
            <div className="pl-row">
              <span className="k">Nhà cung cấp</span>
              <span className="v" style={{ fontWeight: 600, color: 'var(--brand, #10B981)' }}>{trip.fuelSupplier.name}</span>
            </div>
          )}
        </div>

        {fuelLiters > 0 && (
          <div className="fuel-compare">
            <div className="fc-title">So sánh nhiên liệu</div>
            <div className="bullet">
              <div className="bullet-head">
                <span className="bl">Phát hành</span>
                <span className="bv">{fuelLiters.toFixed(1)} L</span>
              </div>
              <div className="track">
                <div className="fill actual" style={{ width: `${Math.min((fuelLiters / (computedLiters || 1)) * 100, 100)}%` }} />
              </div>
            </div>
            {computedLiters > 0 && (
              <div className="bullet">
                <div className="bullet-head">
                  <span className="bl">Định mức</span>
                  <span className="bv">{computedLiters.toFixed(1)} L</span>
                </div>
                <div className="track">
                  <div className="fill norm" style={{ width: '100%' }} />
                </div>
              </div>
            )}
            {Math.abs(fuelVarianceLiters) > 0.5 && (
              <div className="fc-flag">
                <AlertTriangle size={15} />
                {fuelVarianceOver
                  ? `Vượt định mức +${fuelVarianceLiters.toFixed(1)} L`
                  : `Tiết kiệm ${Math.abs(fuelVarianceLiters).toFixed(1)} L`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
