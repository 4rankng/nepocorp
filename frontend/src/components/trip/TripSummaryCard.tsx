import './TripSummaryCard.css';
import { Clock, DollarSign, Users } from 'lucide-react';
import { useTripFormContext } from '../../hooks/useTripFormContext';
import { Money } from '../shared/Money';

export function TripSummaryCard() {
  const form = useTripFormContext();
  const revenue = Number(form.revenue) || 0;
  const fuelCost = form.estimatedFuelCost;
  const tollCost = form.estimatedTollCost;
  const driverSalary = Number(form.driverSalary) || 0;
  const profit = form.estimatedProfit;
  const profitTone = profit < 0 ? 'neg' : profit > 0 ? 'pos' : null;
  const tollStations = Number(form.tollsStations) || 0;

  return (
    <div className="tc-summary-card">
      <h3 className="tc-summary-card__label">Ước tính</h3>
      <div className="tc-summary-card__big mono">
        <Money value={revenue} />
      </div>
      <div className="tc-summary-card__mini">Doanh thu chuyến · chưa trừ chi phí</div>

      <div className="tc-summary-rows">
        <div className="tc-summary-row">
          <span className="tc-summary-row__lbl"><Clock size={12} /> Nhiên liệu (ước)</span>
          <span className="tc-summary-row__val tc-summary-row__val--neg">
            <Money value={Math.abs(fuelCost)} sign="−" />
          </span>
        </div>
        <div className="tc-summary-row">
          <span className="tc-summary-row__lbl"><DollarSign size={12} /> Vé đường ({tollStations} trạm)</span>
          <span className="tc-summary-row__val tc-summary-row__val--neg">
            <Money value={Math.abs(tollCost)} sign="−" />
          </span>
        </div>
        <div className="tc-summary-row">
          <span className="tc-summary-row__lbl"><Users size={12} /> Tiền kết hợp</span>
          <span className="tc-summary-row__val tc-summary-row__val--neg">
            <Money value={Math.abs(driverSalary)} sign="−" />
          </span>
        </div>
        <div className="tc-summary-row tc-summary-row--total">
          <span className="tc-summary-row__lbl">Lợi nhuận dự kiến</span>
          <span className={`tc-summary-row__val${profitTone ? ` tc-summary-row__val--${profitTone}` : ''}`}>
            <Money value={Math.abs(profit)} sign={profit < 0 ? '−' : profit > 0 ? '+' : undefined} />
          </span>
        </div>
      </div>
    </div>
  );
}
