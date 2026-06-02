import React from 'react';
import { Fuel, AlertTriangle } from 'lucide-react';
import { FUEL_MODE_LABELS } from '@nepocorp/shared';
import { formatCurrency } from '../../lib/format';
import type { TripDetail } from '@nepocorp/shared';

interface TripDetailFuelCardProps {
  trip: TripDetail;
  fuelPriceConfig: number | null;
}

export function TripDetailFuelCard({ trip, fuelPriceConfig }: TripDetailFuelCardProps) {
  const fuelLiters = Number(trip.fuelLiters) || 0;
  const computedLiters = trip.legs?.reduce((s, l) => s + Number(l.calculatedLiters || 0), 0) ?? 0;
  const totalKm = trip.legs?.reduce((s, l) => s + Number(l.km), 0) ?? 0;
  const ttbq = totalKm > 0 && fuelLiters > 0 ? (fuelLiters / totalKm) * 100 : 0;
  const diff = fuelLiters - computedLiters;
  const isOver = diff > 0;

  return (
    <div className="card">
      <div className="card-head">
        <h2>
          <span className="hicon">
            <Fuel size={15} />
          </span>
          Nhiên liệu
        </h2>
      </div>
      <div className="card-body">
        <div className="fuel-list">
          <div className="pl-row">
            <span className="k">Chế độ tính</span>
            <span className="v">{FUEL_MODE_LABELS[trip.fuelMode]}</span>
          </div>
          <div className="pl-row">
            <span className="k">Đơn giá cấu hình</span>
            <span className="v">
              {fuelPriceConfig != null
                ? `${fuelPriceConfig.toLocaleString('vi-VN')} đ/lít`
                : '—'}
            </span>
          </div>
          <div className="pl-row">
            <span className="k">Tiêu thụ bình quân</span>
            <span className="v">
              {ttbq > 0 ? `${ttbq.toFixed(1)} L/100km` : '—'}
            </span>
          </div>
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
                <div
                  className="fill actual"
                  style={{ width: `${Math.min((fuelLiters / (computedLiters || 1)) * 100, 100)}%` }}
                />
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
            {Math.abs(diff) > 0.5 && (
              <div className="fc-flag">
                <AlertTriangle size={15} />
                {isOver
                  ? `Vượt định mức +${diff.toFixed(1)} L`
                  : `Tiết kiệm ${Math.abs(diff).toFixed(1)} L`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
