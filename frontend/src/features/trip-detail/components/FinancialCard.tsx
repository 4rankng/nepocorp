import React from 'react';
import { Wallet } from 'lucide-react';
import { fmtCurrency } from '../formatters';
import type { TripDerivedData } from '../types';

interface FinancialCardProps {
  derived: TripDerivedData;
}

export function FinancialCard({ derived }: FinancialCardProps) {
  const { revenue, fuelCost, roadAllowance, driverSalary, serviceCost, totalCost, grossProfit } = derived;

  return (
    <div className="card">
      <div className="card-head">
        <h2><span className="hicon"><Wallet size={15} /></span>Phân tích tài chính</h2>
      </div>
      <div className="card-body">
        <div className="pl">
          <div className="pl-row">
            <span className="k">Doanh thu</span>
            <span className="v">{fmtCurrency(revenue)}</span>
          </div>
          <div className="pl-divider dashed" />
          <div className="pl-row">
            <span className="k"><span className="swatch" style={{ background: 'var(--accent)' }} />Chi phí nhiên liệu</span>
            <span className="v neg">{fuelCost > 0 ? `− ${fmtCurrency(fuelCost)}` : '0 đ'}</span>
          </div>
          <div className="pl-row">
            <span className="k"><span className="swatch" style={{ background: '#C2CAC6' }} />Tiền đi đường</span>
            <span className={`v ${roadAllowance === 0 ? 'zero' : ''}`}>{roadAllowance > 0 ? fmtCurrency(roadAllowance) : '0 đ'}</span>
          </div>
          <div className="pl-row">
            <span className="k"><span className="swatch" style={{ background: '#C2CAC6' }} />Tiền kết hợp</span>
            <span className={`v ${driverSalary === 0 ? 'zero' : ''}`}>{driverSalary > 0 ? fmtCurrency(driverSalary) : '0 đ'}</span>
          </div>
          <div className="pl-row">
            <span className="k"><span className="swatch" style={{ background: '#C2CAC6' }} />Chi phí dịch vụ</span>
            <span className={`v ${serviceCost === 0 ? 'zero' : ''}`}>{serviceCost > 0 ? fmtCurrency(serviceCost) : '0 đ'}</span>
          </div>
          <div className="pl-divider" />
          <div className="pl-row subtotal">
            <span className="k">Tổng chi phí</span>
            <span className="v">{fmtCurrency(totalCost)}</span>
          </div>
          <div className="pl-total">
            <span className="k">Lợi nhuận gộp</span>
            <span className="v">{fmtCurrency(grossProfit).replace('₫', '').trim()}<span className="u"> đ</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
