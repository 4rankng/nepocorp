import React from 'react';
import { Clock, DollarSign, Users } from 'lucide-react';
import { useTripFormContext } from '../../hooks/useTripFormContext';

function fmt(v: number) {
  return Math.abs(v).toLocaleString('vi-VN');
}

export function TripSummaryCard() {
  const form = useTripFormContext();
  const revenue = Number(form.revenue) || 0;
  const fuelCost = form.estimatedFuelCost;
  const tollCost = form.estimatedTollCost;
  const driverSalary = Number(form.driverSalary) || 0;
  const profit = form.estimatedProfit;
  const tollStations = Number(form.tollsStations) || 0;

  return (
    <div className="tc-summary-card">
      <h3 className="tc-summary-card__label">Ước tính lệnh</h3>
      <div className="tc-summary-card__big mono">
        {fmt(revenue)}
        <span className="tc-summary-card__currency">đ</span>
      </div>
      <div className="tc-summary-card__mini">Doanh thu chuyến · chưa trừ chi phí</div>

      <div className="tc-summary-rows">
        <div className="tc-summary-row">
          <span className="tc-summary-row__lbl"><Clock size={12} /> Nhiên liệu (ước)</span>
          <span className="tc-summary-row__val tc-summary-row__val--neg">−{fmt(fuelCost)}</span>
        </div>
        <div className="tc-summary-row">
          <span className="tc-summary-row__lbl"><DollarSign size={12} /> Vé đường ({tollStations} trạm)</span>
          <span className="tc-summary-row__val tc-summary-row__val--neg">−{fmt(tollCost)}</span>
        </div>
        <div className="tc-summary-row">
          <span className="tc-summary-row__lbl"><Users size={12} /> Tiền kết hợp</span>
          <span className="tc-summary-row__val tc-summary-row__val--neg">−{fmt(driverSalary)}</span>
        </div>
        <div className="tc-summary-row tc-summary-row--total">
          <span className="tc-summary-row__lbl" style={{ color: 'rgba(255,255,255,0.85)' }}>Lợi nhuận dự kiến</span>
          <span className="tc-summary-row__val tc-summary-row__val--pos">+{fmt(profit)}</span>
        </div>
      </div>
    </div>
  );
}
